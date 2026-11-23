import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleOrderRequest } from '../../cloudflare-worker/order-worker.mjs';

const base = 'https://hamdi--photography.example/api/order/';
const env = () => ({
  ORDER_ENABLED: 'true', AI: {}, ORDER_MAIL_SECRET: 'x'.repeat(40),
});
const wav = () => new Response(new Uint8Array([82,73,70,70]), {
  headers: { 'content-type': 'audio/wav', 'cache-control': 'public,max-age=31536000,immutable' },
});
const withCache = async (run) => {
  const oldCaches = globalThis.caches;
  const saved = new Map();
  let gets = 0, puts = 0;
  globalThis.caches = { default: {
    async match(request) { gets++; return saved.get(request.url)?.clone(); },
    async put(request,response) { puts++; saved.set(request.url,response.clone()); },
  } };
  try { await run({ saved, reads:()=>gets, writes:()=>puts }); }
  finally { if(oldCaches===undefined)delete globalThis.caches; else globalThis.caches=oldCaches; }
};

test('immutable public audio prompt is cached after first guarded fetch', async () => {
  await withCache(async cache => {
    let calls = 0;
    const live = env();
    live.ORDER_GUARD = {
      idFromName(name) { assert.equal(name,'hamdi-order-prompts-v1'); return name; },
      get() { return {async fetch(){ calls++; return wav(); }}; },
    };
    const jobs = [];
    const ctx = { waitUntil(promise){ jobs.push(promise); } };
    const request = new Request(base+'prompt/aoede-v3/ar/welcome.wav');
    assert.equal((await handleOrderRequest(request,live,ctx)).status,200);
    await Promise.all(jobs);
    assert.equal((await handleOrderRequest(request,live,ctx)).status,200);
    assert.equal(calls,1);
    assert.equal(cache.reads(),2);
    assert.equal(cache.writes(),1);
  });
});

test('range requests bypass cache and preserve partial content semantics', async () => {
  await withCache(async cache => {
    let calls = 0;
    const live = env();
    live.ORDER_GUARD = {idFromName:()=> 'prompt', get:()=>({fetch:async()=>{calls++;return new Response('part',{status:206,headers:{'content-range':'bytes 0-3/100'}});}})};
    const request = new Request(base+'prompt/aoede-v3/tr/welcome.wav',{headers:{range:'bytes=0-3'}});
    assert.equal((await handleOrderRequest(request,live)).status,206);
    assert.equal((await handleOrderRequest(request,live)).status,206);
    assert.equal(calls,2);
    assert.equal(cache.reads(),0);
    assert.equal(cache.writes(),0);
  });
});

test('private booking endpoints and failures never populate cache', async () => {
  await withCache(async cache => {
    const live = env();
    live.ORDER_GUARD = {idFromName:()=> 'prompt',get:()=>({fetch:async()=>Response.json({error:'down'},{status:503})})};
    const jobs=[];
    assert.equal((await handleOrderRequest(new Request(base+'prompt/aoede-v3/ar/welcome.wav'),live,{waitUntil:p=>jobs.push(p)})).status,503);
    assert.equal((await handleOrderRequest(new Request(base+'session',{method:'POST'}),live)).status,403);
    assert.equal((await handleOrderRequest(new Request(base+'send',{method:'POST'}),live)).status,403);
    assert.equal(cache.writes(),0);
    assert.equal(cache.reads(),1);
  });
});

test('no request runtime cache support preserves guarded origin behavior', async () => {
  const oldCaches=globalThis.caches;
  delete globalThis.caches;
  try {
    let hits=0;
    const live=env();
    live.ORDER_GUARD={idFromName:()=> 'prompt',get:()=>({fetch:async()=>{hits++;return wav();}})};
    assert.equal((await handleOrderRequest(new Request(base+'prompt/aoede-v3/ar/welcome.wav'),live)).status,200);
    assert.equal(hits,1);
  } finally {if(oldCaches!==undefined)globalThis.caches=oldCaches;}
});
