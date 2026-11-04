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
export function readOrderPrompt(request) {
  const url=new URL(request.url);
  if(request.method!=='GET'||url.search)return null;
  const match=/^\/api\/order\/prompt\/aoede-v1\/(ar|tr)\/([a-z]+)\.wav$/.exec(url.pathname);
  return match&&Object.hasOwn(ORDER_PROMPTS[match[1]],match[2])?{language:match[1],key:match[2]}:null;
}
const errorResponse=(error,status=503)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
export function promptResponse(bytes,cached=false) {
  return new Response(bytes,{headers:{'content-type':'audio/wav','cache-control':'public,max-age=31536000,immutable','x-content-type-options':'nosniff','x-hamdi-prompt-cache':cached?'hit':'miss'}});
}
export async function synthesizeOrderPrompt(prompt,env,fetchImpl=fetch) {
  const generate=model=>fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'content-type':'application/json'},
    body:JSON.stringify({model,input:[{type:'user_input',content:[{
      type:'text',text:ORDER_PROMPTS[prompt.language][prompt.key],
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
export async function cachedOrderPrompt(guard,prompt) {
  if(guard.env.GEMINI_FREE_TIER_CONFIRMED!=='true'||!guard.env.GEMINI_API_KEY)return errorResponse('prompt-not-configured');
  const key='prompt-'+PROMPT_VERSION+'-'+prompt.language+'-'+prompt.key;
  const cached=await guard.ctx.storage.get(key);
  if(cached)return promptResponse(cached,true);
  const now=guard.now(),day=new Date(now).toISOString().slice(0,10);
  const claimed=await guard.ctx.storage.transaction(async storage=>{
    const old=await storage.get('prompt-budget'),budget=old?.day===day?old:{day,used:0,next:{}};
    if(budget.used>=24||(budget.next[key]||0)>now)return false;
    budget.used++;budget.next[key]=now+60000;await storage.put('prompt-budget',budget);return true;
  });
  if(!claimed)return errorResponse('prompt-limit',429);
  try {const bytes=await guard.synthesize(prompt,guard.env);await guard.ctx.storage.put(key,bytes);return promptResponse(bytes);}
  catch(error){return errorResponse(['prompt-provider-auth','prompt-provider-quota','prompt-provider-unavailable','prompt-audio-invalid'].includes(error.message)?error.message:'prompt-unavailable');}
}
