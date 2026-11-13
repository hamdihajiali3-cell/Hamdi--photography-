// Only studio-owned prompts reach Google. No customer text is accepted here.
export const ORDER_PROMPTS = Object.freeze({
  ar:Object.freeze({
    service:'شو الخدمة اللي بدك ياها؟ تعديل ألوان، تخرج، تصوير الحلاقة، أو صور جواز وهويات؟',
    name:'شو اسمك؟',
    channel:'كيف بتحب حمدي يتواصل معك؟ واتساب، رسالة قصيرة، أو بريد إلكتروني؟',
    phone:'قول رقمك رقم رقم، أو اكتبه بالخانة.',
    email:'قول عنوان بريدك الإلكتروني، أو اكتبه بالخانة حتى نتأكد منه.',
    when:'أي يوم ووقت بتفضّل؟ اختياري، فيك تضغط نتفق لاحقًا.',
    review:'راجع طلبك المكتوب، وبعدها اضغط تأكيد الإرسال.',
    sent:'تم إرسال طلبك إلى بريد حمدي. سيتواصل معك عبر الوسيلة التي اخترتها بعد مراجعة الطلب.'
  }),
  tr:Object.freeze({
    service:'Hangi hizmeti istiyorsun? Renk düzenleme, mezuniyet, berber çekimi veya pasaport ve kimlik fotoğrafı?',
    name:'Adın nedir?',
    channel:'Hamdi sana nasıl ulaşsın? WhatsApp, SMS veya e-posta?',
    phone:'Telefon numaranı rakam rakam söyle veya kutuya yaz.',
    email:'E-posta adresini söyle veya doğru olması için kutuya yaz.',
    when:'Hangi gün ve saati tercih edersin? İstersen zamanı sonra kararlaştırabiliriz.',
    review:'Yazılı talebini incele. Ardından gönderimi onayla.',
    sent:'Talebin Hamdi’ye e-posta ile gönderildi. İnceledikten sonra seçtiğin yoldan sana ulaşacak.'
  })
});
export const PROMPT_VERSION='aoede-v1';
const channelPrompts = {
  ar:{
    service:'شو الخدمة اللي بدك ياها؟ تعديل ألوان، تصوير تخرج، تصوير الحلاقة، صور جواز وهويات، أو تصوير شخصي؟',
    channel:'بأي طريقة بدك المساعد يرسل طلبك لحمدي؟ اختار من القنوات المتاحة.',
    email:'حتى يقدر حمدي يتواصل معك، قول رقم هاتفك رقم رقم، أو أعطينا بريدك الإلكتروني.',
    sent:'قبلت خدمة الإرسال طلبك. احتفظ برقم الطلب للتواصل مع الاستوديو.',
    when:'أي يوم ووقت بتفضّل؟ إذا بدك نتفق بعدين، قول بدون موعد.',
    received:'وصل طلبك لخدمة الإرسال. ملخص طلبك ورقمه ظاهرين قدّامك.',
    delivered:'وصل طلبك لحمدي. ملخص طلبك ورقمه ظاهرين قدّامك.'
  },
  tr:{
    service:'Hangi hizmeti istiyorsun? Renk düzenleme, mezuniyet, berber çekimi, pasaport ve kimlik fotoğrafı veya portre çekimi?',
    channel:'Asistan talebini Hamdi’ye nasıl göndersin? Kullanılabilir kanallardan birini seç.',
    email:'Hamdi sana ulaşabilsin diye telefon numaranı rakam rakam söyle veya e-posta adresini ver.',
    sent:'Gönderim sağlayıcısı talebini kabul etti. Stüdyoyla görüşmek için talep numaranı sakla.',
    when:'Hangi gün ve saati tercih edersin? İstersen zamanı sonra kararlaştıralım de.',
    received:'Gönderim sağlayıcısı talebini aldı. Talep özeti ve numarası ekranda.',
    delivered:'Talebin Hamdi’ye ulaştı. Talep özeti ve numarası ekranda.'
  }
};
export function readOrderPrompt(request) {
  const url=new URL(request.url);
  if(request.method!=='GET'||url.search)return null;
  const match=/^\/api\/order\/prompt\/(aoede-v1|aoede-v2)\/(ar|tr)\/([a-z]+)\.wav$/.exec(url.pathname);
  if(!match)return null;
  const [,version,language,key]=match;
  const prompts=version==='aoede-v2'?channelPrompts:ORDER_PROMPTS;
  if(!Object.hasOwn(prompts[language],key))return null;
  return version==='aoede-v2'?{language,key,version}:{language,key};
}
const errorResponse=(error,status=503)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
export function promptResponse(bytes,cached=false,range='') {
  const size=bytes.byteLength;
  const headers={
    'content-type':'audio/wav','cache-control':'public,max-age=31536000,immutable',
    'x-content-type-options':'nosniff','x-hamdi-prompt-cache':cached?'hit':'miss','accept-ranges':'bytes'
  };
  const parts=/^bytes=(\d*)-(\d*)$/i.exec(range);
  if (!parts || (!parts[1] && !parts[2])) {
    return new Response(bytes,{headers:{...headers,'content-length':String(size)}});
  }
  const start=parts[1]?Number(parts[1]):Math.max(0,size-Number(parts[2]));
  const end=parts[1] && parts[2]?Math.min(Number(parts[2]),size-1):size-1;
  if (start>end || start>=size) {
    return new Response(null,{status:416,headers:{'content-range':'bytes */'+size,'cache-control':'no-store'}});
  }
  return new Response(bytes.slice(start,end+1),{
    status:206,headers:{...headers,'content-range':`bytes ${start}-${end}/${size}`,'content-length':String(end-start+1)}
  });
}
export async function synthesizeOrderPrompt(prompt,env,fetchImpl=fetch) {
  const generate=model=>fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'content-type':'application/json'},
    body:JSON.stringify({model,input:[{type:'user_input',content:[{
      type:'text',text:(prompt.version==='aoede-v2'?channelPrompts:ORDER_PROMPTS)[prompt.language][prompt.key],
      annotations:[{type:'speech_metadata',style:prompt.language==='ar'?'A warm, natural female studio receptionist, speaking gently in Syrian Arabic, at a conversational pace.':'Sıcak ve doğal bir kadın stüdyo asistanı, samimi ve sakin bir konuşma temposuyla.'}]
    }]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:'Aoede'}]}}),
    signal:AbortSignal.timeout(20000)
  });
  let response=await generate('gemini-3.8-flash-tts');
  // Both models have a separately available free allowance in this project.
  // Retry once with the same stock voice and the same fixed transcript.
  if(response.status===429){await response.body?.cancel();response=await generate('gemini-3.8-flash-lite-tts');}
  if(!response.ok)throw new Error([401,403].includes(response.status)?'prompt-provider-auth':response.status===429?'prompt-provider-quota':'prompt-provider-unavailable');
  const result=await response.json();
  const blocks=result.steps?.flatMap(step=>step.type==='model_output'?(step.content||[]):[])||[];
  const block=blocks.find(part=>part.type==='audio');
  if(typeof block?.data!=='string'||block.data.length>1600100)throw new Error('prompt-audio-invalid');
  const bytes=Uint8Array.from(atob(block.data),c=>c.charCodeAt(0));
  if(bytes.length<44||bytes.length>1200044||String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WAVE')throw new Error('prompt-audio-invalid');
  return bytes;
}
export async function cachedOrderPrompt(guard,prompt,range) {
  if(guard.env.GEMINI_FREE_TIER_CONFIRMED!=='true'||!guard.env.GEMINI_API_KEY)return errorResponse('prompt-not-configured');
  const key='prompt-'+(prompt.version||PROMPT_VERSION)+'-'+prompt.language+'-'+prompt.key;
  const cached=await guard.ctx.storage.get(key);
  if(cached)return promptResponse(cached,true,range);
  const now=guard.now(),day=new Date(now).toISOString().slice(0,10);
  const claimed=await guard.ctx.storage.transaction(async storage=>{
    const old=await storage.get('prompt-budget'),budget=old?.day===day?old:{day,used:0,next:{}};
    if(budget.used>=24||(budget.next[key]||0)>now)return false;
    budget.used++;budget.next[key]=now+60000;await storage.put('prompt-budget',budget);return true;
  });
  if(!claimed)return errorResponse('prompt-limit',429);
  try {const bytes=await guard.synthesize(prompt,guard.env);await guard.ctx.storage.put(key,bytes);return promptResponse(bytes,false,range);}
  catch(error){return errorResponse(['prompt-provider-auth','prompt-provider-quota','prompt-provider-unavailable','prompt-audio-invalid'].includes(error.message)?error.message:'prompt-unavailable');}
}
