export const OWNER_EMAIL = 'hamdihajiali76@gmail.com';
export const ORDER_SERVICES = Object.freeze({ color:'تعديل ألوان الصور', graduation:'تصوير التخرج', hair:'تصوير الحلاقة وقصّات الشعر', id:'صور الجواز والهويات' });
export const ORDER_PAGE = 'https://hamdihajiali3-cell.github.io/Hamdi--photography-/';
export const isActivationTest = order => order.service==='color' && order.name==='اختبار الربط — طلب تجريبي فقط' && order.channel==='email' && order.contact==='test@example.com' && order.when==='' && order.language==='ar' && order.notes==='هذه تجربة إعداد بطلب صاحب الموقع. لا تمثل طلب زبون أو حجز موعد.';
export const mailConfigured = env => (env.ORDER_MAIL_SECRET || '').length >= 32 && (env.ORDER_MAIL_PROVIDER === 'formsubmit' || (env.ORDER_MAIL_PROVIDER === 'web3forms' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(env.WEB3FORMS_ACCESS_KEY || '')) || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(env.ORDER_MAIL_ENDPOINT || ''));
const fields = ['service', 'name', 'channel', 'contact', 'when', 'notes', 'language', 'confirmed'];

export function validateOrder(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !fields.includes(k))) return null;
  const limits = { service:20, name:100, channel:15, contact:120, when:160, notes:500, language:2 };
  const order = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value)) return null;
    order[key] = value.trim();
  }
  if (input.confirmed !== true || !Object.hasOwn(ORDER_SERVICES, order.service) || !order.name
    || !['ar', 'tr'].includes(order.language) || !['whatsapp', 'sms', 'email'].includes(order.channel)) return null;
  if (order.channel === 'email') {
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(order.contact)) return null;
  } else if (!/^\+?[\d ()-]{7,30}$/.test(order.contact) || !/^[\d]{7,15}$/.test(order.contact.replace(/\D/g, ''))) return null;
  return order;
}

export function orderEmailText(order, id) {
  const channels = { whatsapp:'واتساب', sms:'SMS', email:'البريد الإلكتروني' };
  return [
    'طلب زبون جديد — Hamdi Photography', `رقم الطلب: ${id}`, '',
    `الخدمة: ${ORDER_SERVICES[order.service]}`, `الاسم: ${order.name}`,
    `قناة إرسال الطلب: ${channels[order.channel]}`, `بيانات التواصل: ${order.contact}`,
    order.when && `الموعد المقترح كما ذكره الزبون: ${order.when}`,
    order.notes && `ملاحظات: ${order.notes}`, '',
    'هذا طلب للتنسيق. لم يتم تأكيد توفر موعد أو سعر، ويؤكد حمدي التفاصيل مع الزبون.'
  ].filter(Boolean).join('\n');
}

export async function signedMailEnvelope(order, id, secret, now = Date.now()) {
  const payload = JSON.stringify({ version:1, id, sentAt:now, order });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
  return { payload, signature:Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
}

export async function sendOrderEmail(order, id, env, fetchImpl = fetch) {
  if (order.channel !== 'email') throw new Error('wrong-delivery-channel');
  if (!mailConfigured(env)) throw new Error('mail-not-configured');
  if (env.ORDER_MAIL_PROVIDER === 'web3forms') {
    const response = await fetchImpl('https://api.web3forms.com/submit', {
      method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify({access_key:env.WEB3FORMS_ACCESS_KEY,from_name:'Hamdi Photography',
        subject:`طلب زبون جديد — Hamdi Photography — ${id.slice(0,8)}`,name:order.name,
        message:orderEmailText(order,id),botcheck:'',
        ...(order.channel==='email'&&!isActivationTest(order)?{email:order.contact,replyto:order.contact}:{})}),
      signal:AbortSignal.timeout(25000)
    });
    let result;try { result=await response.json(); }catch { result=null; }
    if (!response.ok || result?.success!==true) {
      const error=new Error('mail-unconfirmed');
      error.diagnostic={status:response.status,message:String(result?.message||'non-json-provider-response').replaceAll(env.WEB3FORMS_ACCESS_KEY,'[redacted]').slice(0,180)};
      throw error;
    }
    return {accepted:true,id};
  }
  if (env.ORDER_MAIL_PROVIDER === 'formsubmit') {
    const response = await fetchImpl(`https://formsubmit.co/ajax/${OWNER_EMAIL}`, {
      method:'POST', headers:{ 'content-type':'application/json', accept:'application/json' },
      body:JSON.stringify({ name:order.name, message:orderEmailText(order,id),
        _subject:`طلب زبون جديد — Hamdi Photography — ${id.slice(0,8)}`,
        _url:ORDER_PAGE, _captcha:'false', _template:'table',
        ...(order.channel === 'email' ? { _replyto:order.contact } : {}) }),
      signal:AbortSignal.timeout(25000)
    });
    const raw = await response.text();
    let result;try { result=JSON.parse(raw); }catch { result=null; }
    const failure = () => {
      const error = new Error('mail-unconfirmed');
      error.diagnostic = {status:response.status,message:String(result?.message || /<title[^>]*>([^<]+)/i.exec(raw)?.[1] || 'non-json-provider-response').slice(0,180)};
      return error;
    };
    if (!response.ok || !result) throw failure();
    if (/activat|confirm.{0,30}email|verif.{0,30}email/i.test(String(result?.message || ''))) throw new Error('mail-activation-required');
    if (![true,'true'].includes(result?.success)) throw failure();
    return {accepted:true,id};
  }
  const envelope = await signedMailEnvelope(order, id, env.ORDER_MAIL_SECRET);
  const response = await fetchImpl(env.ORDER_MAIL_ENDPOINT, {
    method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(envelope),
    redirect:'follow', signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('mail-unconfirmed');
  const result = await response.json();
  if (result?.accepted !== true || result.id !== id) throw new Error('mail-unconfirmed');
  return { accepted:true, id };
}
