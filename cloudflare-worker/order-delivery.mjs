import { mailConfigured, sendOrderEmail, orderEmailText } from './order-email.mjs';

const e164 = /^\+[1-9]\d{7,14}$/;
const accountSid = /^AC[0-9a-f]{32}$/i;
const messageSid = /^SM[0-9a-f]{32}$/i;
const messagingServiceSid = /^MG[0-9a-f]{32}$/i;

export function orderDeliveryChannels(env) {
  const owner = (env.OWNER_PHONE_NUMBER || '').trim();
  const twilioUser = env.TWILIO_API_KEY_SID || env.TWILIO_ACCOUNT_SID || '';
  const twilioSecret = env.TWILIO_API_KEY_SID ? env.TWILIO_API_KEY_SECRET : env.TWILIO_AUTH_TOKEN;
  return {
    email: env.ORDER_MAIL_ACTIVE === 'true' && mailConfigured(env),
    sms: env.ORDER_SMS_ACTIVE === 'true' && e164.test(owner)
      && accountSid.test(env.TWILIO_ACCOUNT_SID || '') && /^(AC|SK)[0-9a-f]{32}$/i.test(twilioUser)
      && Boolean(twilioSecret) && messagingServiceSid.test(env.TWILIO_SMS_MESSAGING_SERVICE_SID || ''),
    whatsapp: env.ORDER_WHATSAPP_ACTIVE === 'true' && e164.test(owner)
      && Boolean(env.WHATSAPP_ACCESS_TOKEN) && /^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID || '')
      && /^[a-z][a-z0-9_]{0,79}$/.test(env.WHATSAPP_TEMPLATE_NAME || '')
  };
}

function compactOrder(order, id) {
  return orderEmailText(order, id).split('\n')
    .filter(line => !line.startsWith('هذا طلب للتنسيق.') && !line.startsWith('قناة إرسال الطلب:'))
    .join(' | ').replace(/\s+/g, ' ').trim();
}

export function checkOrderDelivery(order, env) {
  if (!orderDeliveryChannels(env)[order.channel]) return 'channel-unavailable';
  if (order.channel === 'sms' && (compactOrder(order, '00000000-0000-0000-0000-000000000000').length > 320
    || /https?:\/\/|www\./i.test(compactOrder(order, '00000000-0000-0000-0000-000000000000')))) {
    return 'sms-content-limit';
  }
  return null;
}

export async function sendOrderByChannel(order, id, env, fetchImpl = fetch) {
  const issue = checkOrderDelivery(order, env);
  if (issue) throw new Error(issue);
  if (order.channel === 'email') {
    await sendOrderEmail(order, id, env, fetchImpl);
    return { state:'accepted' };
  }

  const owner = env.OWNER_PHONE_NUMBER.trim();
  const body = compactOrder(order, id);
  let response;
  if (order.channel === 'sms') {
    const user = env.TWILIO_API_KEY_SID || env.TWILIO_ACCOUNT_SID;
    const secret = env.TWILIO_API_KEY_SID ? env.TWILIO_API_KEY_SECRET : env.TWILIO_AUTH_TOKEN;
    response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method:'POST',
      headers:{ authorization:'Basic '+btoa(user+':'+secret), 'content-type':'application/x-www-form-urlencoded' },
      body:new URLSearchParams({ To:owner, MessagingServiceSid:env.TWILIO_SMS_MESSAGING_SERVICE_SID, Body:body }),
      signal:AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || !messageSid.test(result?.sid || '')
      || !['accepted','queued','sending','sent','delivered'].includes(result?.status)) throw new Error('delivery-unconfirmed');
    return { state:result.status === 'delivered' ? 'delivered' : 'accepted' };
  }

  response = await fetchImpl(`https://graph.facebook.com/v26.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method:'POST',
    headers:{ authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN, 'content-type':'application/json' },
    body:JSON.stringify({
      messaging_product:'whatsapp', recipient_type:'individual', to:owner.slice(1), type:'template',
      template:{
        name:env.WHATSAPP_TEMPLATE_NAME, language:{ code:'ar' },
        components:[{ type:'body', parameters:[{ type:'text', text:body }] }]
      }
    }),
    signal:AbortSignal.timeout(20000)
  });
  const result = await response.json();
  if (!response.ok || !/^wamid\.[A-Za-z0-9_+/=-]{5,512}$/.test(result?.messages?.[0]?.id || '')) throw new Error('delivery-unconfirmed');
  return { state:'accepted' };
}
