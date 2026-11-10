import { validateOrder, isActivationTest } from './order-email.mjs';
import { readOrderPrompt, cachedOrderPrompt, synthesizeOrderPrompt } from './order-speech.mjs';
import { checkOrderDelivery, orderDeliveryChannels, sendOrderByChannel } from './order-delivery.mjs';
import {
  ARCHIVE_PREFIX, ARCHIVE_RETRY_MS, archiveConfigured, archiveKey, archiveTime, scheduleArchive, sendOrderArchive
} from './order-archive.mjs';

const MAX_AUDIO = 480044; // Canonical PCM WAV: mono, 16 kHz, 16 bit, at most 15 seconds.
const KEY = 'order-guard-v1';
const json = (body, status=200) => Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const ready = env => env.ORDER_ENABLED === 'true' && Boolean(env.AI) && (env.ORDER_MAIL_SECRET || '').length >= 32;
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

export function validOrderWav(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length<3244 || bytes.length>MAX_AUDIO) return false;
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),word=(offset,length)=>String.fromCharCode(...bytes.slice(offset,offset+length));
  return word(0,4)==='RIFF' && word(8,8)==='WAVEfmt ' && word(36,4)==='data'
    && v.getUint32(4,true)===bytes.length-8 && v.getUint32(16,true)===16
    && v.getUint16(20,true)===1 && v.getUint16(22,true)===1 && v.getUint32(24,true)===16000
    && v.getUint32(28,true)===32000 && v.getUint16(32,true)===2 && v.getUint16(34,true)===16
    && v.getUint32(40,true)===bytes.length-44 && (bytes.length-44)%2===0;
}
async function readLimited(request,max) {
  if (Number(request.headers.get('content-length'))>max || !request.body) throw new Error('body');
  const reader=request.body.getReader(),parts=[];let count=0;
  try { for (;;) { const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>max){await reader.cancel();throw new Error('body');}parts.push(value); } }
  finally { reader.releaseLock(); }
  const all=new Uint8Array(count);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return all;
}
export async function handleOrderRequest(request,env) {
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/order/prompt/')) {
    if(!readOrderPrompt(request))return json({error:'not-found'},404);
    if(!ready(env)||!env.ORDER_GUARD)return json({error:'orders-not-configured'},503);
    try {return await env.ORDER_GUARD.get(env.ORDER_GUARD.idFromName('hamdi-order-prompts-v1')).fetch(request);}
    catch{return json({error:'prompt-unavailable'},503);}
  }
  if(path==='/api/order/status' && request.method==='GET') {
    const channels=orderDeliveryChannels(env);
    const enabled=ready(env)&&Boolean(env.ORDER_GUARD)&&Object.values(channels).some(Boolean);
    return json({enabled,voice:enabled,channels});
  }
  if(request.method!=='POST'||!['/api/order/session','/api/order/transcribe','/api/order/send'].includes(path))return json({error:'not-found'},404);
  if(!ready(env)||!env.ORDER_GUARD)return json({error:'orders-not-configured'},503);
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'same-origin-required'},403);
  try { return await env.ORDER_GUARD.get(env.ORDER_GUARD.idFromName('hamdi-orders-v1')).fetch(request); }
  catch { return json({error:'order-unavailable'},503); }
}

export class OrderGuard {
  constructor(ctx,env,dependencies={}) {this.ctx=ctx;this.env=env;this.now=dependencies.now||Date.now;this.send=dependencies.send||sendOrderByChannel;this.synthesize=dependencies.synthesize||synthesizeOrderPrompt;this.sendArchive=dependencies.sendArchive||sendOrderArchive;}
  state(raw) {const day=new Date(this.now()).toISOString().slice(0,10);return raw?.day===day?raw:{day,created:0,audio:0,mails:0,sessions:{}};}
  async mutate(fn) {return this.ctx.storage.transaction(async storage=>{const state=this.state(await storage.get(KEY));const result=await fn(state,storage);await storage.put(KEY,state);return result;});}

  async alarm() {
    const storage = this.ctx.storage;
    const pending = await storage.list({ prefix: ARCHIVE_PREFIX, limit: 5 });
    const now = this.now();
    for (const [key, entry] of pending) {
      if (archiveTime(key) > now) break;
      try {
        await this.sendArchive(entry, this.env, this.now());
      } catch {
        await storage.transaction(async transaction => {
          await transaction.put(archiveKey(this.now() + ARCHIVE_RETRY_MS, entry.id), entry);
          await transaction.delete(key);
        });
        continue;
      }
      await storage.delete(key);
    }
    await storage.transaction(async transaction => {
      const next = (await transaction.list({ prefix: ARCHIVE_PREFIX, limit: 1 })).keys().next();
      if (!next.done) await scheduleArchive(storage, Math.max(this.now() + 1000, archiveTime(next.value)));
    });
  }
  async fetch(request) {
    if(!ready(this.env))return json({error:'orders-not-configured'},503);
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/order/prompt/')) {const prompt=readOrderPrompt(request);return prompt?cachedOrderPrompt(this,prompt,request.headers.get('range')):json({error:'not-found'},404);}
    if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'same-origin-required'},403);
    if(!['/api/order/session','/api/order/transcribe','/api/order/send'].includes(path))return json({error:'not-found'},404);
    const ip=await digest((request.headers.get('cf-connecting-ip')||'unknown')+'|'+this.env.ORDER_MAIL_SECRET);
    if(path==='/api/order/session') {
      let body;try {if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw 0;body=JSON.parse(new TextDecoder().decode(await readLimited(request,512)));}catch{return json({error:'invalid-request'},400);}
      if(body?.consent!==true||!['ar','tr'].includes(body.language)||Object.keys(body).some(k=>!['consent','language'].includes(k)))return json({error:'consent-required'},400);
      const token=crypto.randomUUID()+crypto.randomUUID(),hash=await digest(token);
      const accepted=await this.mutate(state=>{
        if(state.created>=20||Object.values(state.sessions).filter(s=>s.ip===ip).length>=8)return false;
        state.created++;state.sessions[hash]={ip,language:body.language,expires:this.now()+1200000,turns:0,status:'open'};return true;
      });
      return accepted?json({token,maxAudioSeconds:15}):json({error:'order-limit'},429);
    }
    const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
    if(!/^[a-f0-9-]{72}$/.test(token||''))return json({error:'session-required'},403);
    const hash=await digest(token);
    if(path==='/api/order/transcribe') {
      if(request.headers.get('content-type')?.split(';')[0]!=='audio/wav')return json({error:'audio-required'},415);
      let bytes;try{bytes=await readLimited(request,MAX_AUDIO);}catch{return json({error:'audio-too-large'},413);}
      if(!validOrderWav(bytes))return json({error:'invalid-audio'},400);
      const language=await this.mutate(state=>{const s=state.sessions[hash];if(!s||s.ip!==ip||s.expires<this.now()||s.status!=='open'||s.turns>=8||state.audio>=160)return null;s.turns++;state.audio++;return s.language;});
      if(!language)return json({error:'order-limit'},429);
      try {
        let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
        const output=await this.env.AI.run('@cf/openai/whisper-large-v3-turbo',{audio:btoa(binary),language,task:'transcribe',vad_filter:true,condition_on_previous_text:false});
        const text=typeof output?.text==='string'?output.text.trim().slice(0,500):'';
        return text?json({text}):json({error:'no-speech'},422);
      }catch{return json({error:'transcription-unavailable'},503);}
    }
    let body;try {if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw 0;body=JSON.parse(new TextDecoder().decode(await readLimited(request,4096)));}catch{return json({error:'invalid-request'},400);}
    const order=validateOrder(body);
    if(!order||isActivationTest(order))return json({error:'invalid-order'},400);
    const claim=await this.mutate(state=>{
      const s=state.sessions[hash];if(!s||s.ip!==ip||s.expires<this.now()||s.language!==order.language)return {error:'session-required'};
      if(s.status==='sent')return {accepted:true,id:s.id,channel:s.channel||'email',state:s.deliveryState||'accepted'};
      if(s.status!=='open')return {error:'delivery-unconfirmed',id:s.id};
      const issue=checkOrderDelivery(order,this.env);
      if(issue)return {error:issue};
      if(state.mails>=20)return {error:'order-limit'};
      state.mails++;s.id=crypto.randomUUID();s.status='pending';return {id:s.id};
    });
    if(claim.accepted)return json(claim);
    if(claim.error)return json(claim,claim.error==='session-required'?403:409);
    try {
      const result=await this.send(order,claim.id,this.env);
      const deliveryState=result?.state==='delivered'?'delivered':'accepted';
      await this.mutate(async (state,storage)=>{
        const s=state.sessions[hash];
        if(s?.id===claim.id)Object.assign(s,{status:'sent',channel:order.channel,deliveryState});
        if (archiveConfigured(this.env)) {
          const time = this.now() + 1000;
          await storage.put(archiveKey(time, claim.id), { id: claim.id, service: order.service, when: order.when });
          // OrderGuard uses SQLite. Alarm calls on ctx.storage share this transaction.
          await scheduleArchive(this.ctx.storage, time);
        }
      });
      return json({accepted:true,id:claim.id,channel:order.channel,state:deliveryState});
    }catch(error) {
      // A timeout can happen after mail acceptance. Never retry with a fresh ID.
      await this.mutate(state=>{if(state.sessions[hash]?.id===claim.id)state.sessions[hash].status='uncertain';});
      const mailErrors=['mail-activation-required','mail-rate-limited','mail-server-rejected'];
      const code=order.channel==='email'&&mailErrors.includes(error.message)?error.message:'delivery-unconfirmed';
      return json({error:code,id:claim.id},502);
    }
  }
}
