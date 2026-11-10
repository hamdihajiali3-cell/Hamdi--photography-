const CONTACT = Object.freeze({ displayPhone: '0537 742 36 71', email: 'hamdihajiali76@gmail.com' });
const SERVICES = Object.freeze({
  color: { ar: 'تعديل ألوان الصور', tr: 'Fotoğraf renk düzenleme' },
  graduation: { ar: 'تصوير التخرّج', tr: 'Mezuniyet çekimi' },
  hair: { ar: 'تصوير الحلاقة وقصّات الشعر', tr: 'Berber ve saç kesimi çekimi' },
  id: { ar: 'صور الجواز والهويات', tr: 'Pasaport ve kimlik fotoğrafları' },
});

function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validateBooking(input, today = localDate()) {
  const text = (value, length) => typeof value === 'string' ? value.trim().slice(0, length) : '';
  const data = {
    service: text(input.service, 30), name: text(input.name, 100), phone: text(input.phone, 40),
    date: text(input.date, 10), time: text(input.time, 5), notes: text(input.notes, 500),
  };
  const errors = [];
  if (!Object.hasOwn(SERVICES, data.service)) errors.push('service');
  if (!data.name) errors.push('name');
  if (data.date) {
    const date = new Date(`${data.date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== data.date || data.date < today) errors.push('date');
  }
  if (data.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) errors.push('time');
  if (data.time && !data.date) errors.push('date');
  if (data.phone && (!/^[+\d\s().-]+$/.test(data.phone) || data.phone.replace(/\D/g, '').length < 7 || data.phone.replace(/\D/g, '').length > 15)) errors.push('phone');
  return { data, errors: [...new Set(errors)], valid: errors.length === 0 };
}

function bookingMessage(data, lang = 'ar') {
  if (!Object.hasOwn(SERVICES, data.service)) throw new Error('Unknown service');
  const ar = lang !== 'tr';
  const fields = ar
    ? [['الخدمة', SERVICES[data.service].ar], ['الاسم', data.name], ['الهاتف', data.phone], ['التاريخ المقترح', data.date], ['الوقت المقترح', data.time], ['ملاحظات', data.notes]]
    : [['Hizmet', SERVICES[data.service].tr], ['Ad', data.name], ['Telefon', data.phone], ['Önerilen tarih', data.date], ['Önerilen saat', data.time], ['Notlar', data.notes]];
  return [ar ? 'طلب جلسة — Hamdi Photography' : 'Çekim talebi — Hamdi Photography', '', ...fields.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`), '', ar ? 'هذا طلب للتنسيق، وليس تأكيدًا للموعد. بانتظار تأكيد الاستوديو.' : 'Bu bir planlama talebidir; randevu onayı değildir. Stüdyonun onayını bekliyorum.'].join('\n');
}

function gmailUrl(message) {
  const subject = message.split('\n', 1)[0];
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

function pcmSamples(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < result.length; i++) result[i] = view.getInt16(i * 2, true) / 32768;
  return result;
}

function failureState(error) {
  if (error.name === 'NotAllowedError') return 'permission';
  if (['pilot-limit', 'provider-quota'].includes(error.message)) return 'quota';
  if (error.message === 'connection-timeout') return 'provider-network';
  return ['unsupported', 'provider-auth', 'provider-model', 'provider-network'].includes(error.message) ? error.message : 'unavailable';
}

function providerFailure(error) {
  if (error.code === 429 || error.status === 'RESOURCE_EXHAUSTED') return 'provider-quota';
  if ([401, 403].includes(error.code) || ['UNAUTHENTICATED', 'PERMISSION_DENIED'].includes(error.status)) return 'provider-auth';
  if ([400, 404].includes(error.code) || ['INVALID_ARGUMENT', 'NOT_FOUND'].includes(error.status)) return 'provider-model';
  return 'unavailable';
}

class CustomerVoice {
  constructor({ onState, onTranscript, onOrder }) { this.onState = onState; this.onTranscript = onTranscript; this.onOrder = onOrder; this.run = 0; this.players = new Set(); this.muted = false; }
  async start(language, { microphone = true } = {}) {
    this.stop(false);
    const run = ++this.run;
    this.active = true; this.muted = false;
    this.outputOnly = !microphone; this.outputTurnComplete = false; this.playedAudio = false;
    try {
      if (!window.AudioContext || (microphone && (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode
        || (window.document?.permissionsPolicy || window.document?.featurePolicy)?.allowsFeature?.('microphone') === false))) {
        throw new Error('unsupported');
      }
      this.onState('connecting');
      this.audio = new AudioContext();
      const activated = this.audio.resume().then(()=>true,()=>false);
      if (microphone) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        if (run !== this.run) { stream.getTracks().forEach(track => track.stop()); return; }
        this.stream = stream;
      }
      if (!(await activated)) throw new Error('unsupported');
      if (run !== this.run) return;
      const response = await fetch('/api/live-token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language, adult: true, consent: true }) }).catch(() => { throw new Error('provider-network'); });
      const config = await response.json();
      if (!response.ok) throw new Error(config.error || 'unavailable');
      if (run !== this.run) return;
      if (typeof config.token !== 'string' || !config.token.startsWith('auth_tokens/') || !['v1alpha', 'v1beta'].includes(config.version)) throw new Error('unavailable');
      const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${config.version}.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(config.token)}`);
      this.socket = socket;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('connection-timeout')), 15000);
        socket.addEventListener('open', () => socket.send(JSON.stringify({ setup: { model: config.model } })));
        socket.addEventListener('message', async event => {
          if (run !== this.run) return;
          try {
            const text = event.data instanceof Blob ? await event.data.text() : event.data instanceof ArrayBuffer ? new TextDecoder().decode(event.data) : event.data;
            if (run !== this.run) return;
            const message = JSON.parse(text);
            if (message.error) { const error = new Error(providerFailure(message.error)); clearTimeout(timer); reject(error); this.stop(false); this.onState(failureState(error)); return; }
            if (message.setupComplete) { clearTimeout(timer); resolve(); return; }
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls.slice(0, 4)) {
                const args = call.args || {};
                const service = args.service || '';
                const allowed = call.name === 'start_order' && !this.outputOnly && typeof this.onOrder === 'function'
                  && args && typeof args === 'object' && !Array.isArray(args) && Object.keys(args).every(key => key === 'service')
                  && ['', 'color', 'graduation', 'hair', 'id'].includes(service);
                socket.send(JSON.stringify({ toolResponse: { functionResponses: [{ id:call.id, name:call.name, response:{ result:allowed ? 'opening_separate_order_workflow' : 'unavailable' } }] } }));
                if (allowed) { this.stop(false); this.onOrder(service); return; }
              }
            }
            const content = message.serverContent;
            if (content?.interrupted) this.clearPlayback();
            for (const part of content?.modelTurn?.parts || []) if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) this.play(part.inlineData);
            if (content?.outputTranscription?.text) this.onTranscript(content.outputTranscription.text);
            if (content?.turnComplete) {
              this.outputTurnComplete = true;
              if (!this.completeOutputTest() && this.players.size === 0) this.onState(this.muted ? 'muted' : 'listening');
            }
          } catch { /* Ignore malformed provider messages; never log audio or token data. */ }
        });
        socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('provider-network')); if (run === this.run) { this.stop(false); this.onState('provider-network'); } });
        socket.addEventListener('close', event => { clearTimeout(timer); reject(new Error('unavailable')); if (run === this.run) { this.stop(false); this.onState(event.code === 1000 ? 'ended' : event.code === 1006 ? 'provider-network' : 'unavailable'); } });
      });
      if (run !== this.run) return;
      if (microphone) {
        await this.audio.audioWorklet.addModule(new URL('./microphone.js?v=mobile-audio-20261110', window.location.href).href);
        if (run !== this.run) return;
        this.source = this.audio.createMediaStreamSource(this.stream);
        this.microphone = new AudioWorkletNode(this.audio, 'hamdi-microphone', {processorOptions:{outputRate:16000}});
        this.silence = this.audio.createGain();
        this.silence.gain.value = 0;
        this.microphone.port.onmessage = event => {
          if (!this.active || this.muted || socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 262144) return;
          const bytes = new Uint8Array(event.data);
          let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
          socket.send(JSON.stringify({ realtimeInput: { audio: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } } }));
        };
        this.source.connect(this.microphone); this.microphone.connect(this.silence); this.silence.connect(this.audio.destination);
      }
      this.onState('listening');
      socket.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: language === 'tr' ? 'Kendini tek kısa cümlede tanıt ve fotoğraf hizmetleriyle ilgili nasıl yardımcı olabileceğini sor.' : 'عرّف عن نفسك بجملة قصيرة واسأل كيف تساعدني في معرفة خدمات التصوير.' }] }], turnComplete: true } }));
      this.limit = setTimeout(() => this.stop('limit'), Math.min(microphone ? 180 : 30, config.maxSeconds || 120) * 1000);
    } catch (error) {
      if (run !== this.run) return;
      this.stop(false);
      this.onState(failureState(error));
    }
  }
  play(inline) {
    if (!this.audio || this.audio.state === 'closed') return;
    const bytes = Uint8Array.from(atob(inline.data), char => char.charCodeAt(0));
    const samples = pcmSamples(bytes);
    const rate = Number(/rate=(\d+)/.exec(inline.mimeType)?.[1]) || 24000;
    const buffer = this.audio.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const player = this.audio.createBufferSource(); player.buffer = buffer; player.connect(this.audio.destination);
    const start = Math.max(this.audio.currentTime, this.nextAudio || 0);
    this.nextAudio = start + buffer.duration; this.players.add(player); this.onState('speaking');
    player.onended = () => {
      this.players.delete(player); player.disconnect(); this.playedAudio = true;
      if (this.active && this.players.size === 0 && !this.completeOutputTest()) this.onState(this.muted ? 'muted' : 'listening');
    };
    player.start(start);
  }
  completeOutputTest() {
    if (!this.outputOnly || !this.outputTurnComplete || this.players.size) return false;
    this.stop(this.playedAudio ? 'test-complete' : 'unavailable');
    return true;
  }
  clearPlayback() { for (const player of this.players) { player.onended = null; try { player.stop(); } catch {} player.disconnect(); } this.players.clear(); this.nextAudio = 0; }
  mute() {
    if (!this.active || !this.stream) return;
    this.muted = !this.muted;
    this.stream?.getAudioTracks().forEach(track => { track.enabled = !this.muted; });
    if (this.muted && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    this.onState(this.muted ? 'muted' : 'listening');
    return this.muted;
  }
  stop(reason = 'ended') {
    this.run++; this.active = false; clearTimeout(this.limit); this.clearPlayback();
    if (this.socket) { try { this.socket.close(); } catch {} this.socket = null; }
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.source?.disconnect(); this.microphone?.disconnect(); this.silence?.disconnect();
    this.source = null; this.microphone = null; this.silence = null;
    if (this.audio) { this.audio.close().catch(() => {}); this.audio = null; }
    if (reason) this.onState(reason);
  }
}

function orderService(value) {
  const s=value.toLowerCase().normalize('NFKC').replace(/[\u0640\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا');
  const matches=[['color',/color|renk|düzen|duzen|الوان|لون|تعديل/],['graduation',/graduation|mezun|تخرج/],['hair',/hair|berber|saç|sac|حلاق|شعر|قصات/],['id',/\bid\b|pasaport|kimlik|هوي|جواز/]].filter(([,re])=>re.test(s));
  return matches.length===1?matches[0][0]:'';
}
function orderChannel(value) {
  const s=normalizedOrderReply(value);
  if (/(?:^|\s)(?:لا|ما|مو|مش|hayır|hayir|değil|degil|istemiyorum)(?:\s|[،,.!?؟]|$)/u.test(s)) return '';
  const matches=[
    ['whatsapp',/واتس|الوتس|whats/],
    ['email',/بريد|ايميل|email|e-mail|posta/],
    ['sms',/sms|اس\s*ام\s*اس|اسمس|رسالة\s+قصيرة|kısa mesaj|kisa mesaj/]
  ].filter(([,pattern])=>pattern.test(s));
  return matches.length===1 ? matches[0][0] : '';
}
function orderPhone(value) {
  const arabic='٠١٢٣٤٥٦٧٨٩',persian='۰۱۲۳۴۵۶۷۸۹';
  const words={صفر:'0',واحد:'1',اثنين:'2',اتنين:'2',ثلاثة:'3',ثلاثه:'3',اربعة:'4',اربعه:'4',خمسة:'5',خمسه:'5',ستة:'6',سته:'6',سبعة:'7',سبعه:'7',ثمانية:'8',ثمانيه:'8',تمانية:'8',تسعة:'9',تسعه:'9','sıfır':'0',sifir:'0',bir:'1',iki:'2','üç':'3',uc:'3','dört':'4',dort:'4','beş':'5',bes:'5','altı':'6',alti:'6',yedi:'7',sekiz:'8',dokuz:'9'};
  const spoken = normalizedOrderReply(value).replace(/^(?:رقمي|رقم هاتفي|رقم الهاتف|telefon numaram|numaram)\s*[:،]?\s*/,'');
  const number = spoken.replace(/[٠-٩]/g,c=>arabic.indexOf(c)).replace(/[۰-۹]/g,c=>persian.indexOf(c))
    .replace(/[()]/g,'').split(/[\s,،.-]+/).map(word=>Object.hasOwn(words,word)?words[word]:word).join('');
  return /^\+?\d+$/.test(number) ? number : '';
}

function orderContact(value, channel) {
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  if (channel === 'email') {
    const address = value.trim();
    if (email.test(address)) return address;
    const spoken = normalizedOrderReply(address)
      .replace(/^(?:بريدي(?: الالكتروني)?|ايميلي|e-posta adresim)\s*[:،]?\s*/,'')
      .replace(/\s+(?:at|ات|ات ساين|et|kuyruklu a)\s+/g,'@')
      .replace(/\s+(?:dot|دوت|نقطة|nokta)\s+/g,'.')
      .replace(/\s*([@.])\s*/g,'$1')
      .replace(/@(?:جي ?ميل|جي مايل|g mail)(?=\.)/g,'@gmail')
      .replace(/\.(?:كوم|kom)[.!؟]?$/g,'.com')
      .replace(/[.!؟]$/,'');
    if (/^[\x21-\x7e]+$/.test(spoken) && email.test(spoken)) return spoken;
  }
  const phone = orderPhone(value);
  return /^\+?\d{7,15}$/.test(phone) ? phone : '';
}
function orderWav(chunks) {
  const size=chunks.reduce((n,c)=>n+c.length,0),bytes=new Uint8Array(44+size),v=new DataView(bytes.buffer);
  const word=(offset,text)=>{for(let i=0;i<text.length;i++)bytes[offset+i]=text.charCodeAt(i);};
  word(0,'RIFF');v.setUint32(4,36+size,true);word(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,size,true);
  let at=44;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;
}

function orderPromptUrl(language,key) {
  if (!['ar','tr'].includes(language) || !['service','name','channel','phone','email','when','review','sent','received','delivered'].includes(key)) return null;
  const version = ['channel','email','sent','when','received','delivered'].includes(key) ? 'aoede-v2' : 'aoede-v1';
  return '/api/order/prompt/'+version+'/'+language+'/'+key+'.wav';
}

function normalizedOrderReply(value) {
  return value.toLowerCase().normalize('NFKC').replace(/[\u0640\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').trim();
}

function isOrderCancellation(text) {
  return /(?:لا|ما)\s*(?:ترسل|تبعت)|(?:الغاء|الغي|الغ|وقف)\s*(?:ال)?(?:طلب|حجز)|\b(?:iptal(?: et)?|gönderme|gonderme)\b/i.test(text);
}


const orderCopy = {
  ar:{
    title:'طلبك مع حمدي', intro:'اختَر قناة الإرسال بصوتك. بعد اكتمال الأجوبة، المساعد يرسل الطلب تلقائيًا لحمدي ويعرض لك الملخص ورقم الطلب.',
    privacy:'عند بدء الحجز بالصوت، يُحوّل Cloudflare أجوبتك إلى نص. باختيار قناة الإرسال بصوتك، توافق على إرسال تفاصيل الطلب عبرها فور اكتمالها. يمكنك قول «ألغِ الطلب» قبل الإرسال.',
    start:'ابدأ الحجز بالصوت', typed:'المتابعة كتابة', mute:'أوقف الميكروفون', replay:'اسمع السؤال', close:'إغلاق',
    service:'الخدمة', name:'اسمك', channel:'قناة إرسال الطلب لحمدي', contact:'رقم التواصل أو البريد', when:'الموعد المقترح (اختياري)', notes:'ملاحظات (اختياري)',
    choose:'اختر', next:'التالي', skip:'نتفق على الموعد لاحقًا', review:'راجع التفاصيل وقناة الإرسال قبل التأكيد.',
    send:'أرسل الطلب', pending:'هذا طلب للتنسيق. يؤكد حمدي الموعد والسعر بعد التواصل.',
    speaking:'عم اسألك…', listening:'عم اسمعك…', processing:'عم أفهم جوابك…', typedHint:'يمكنك كتابة الجواب والمتابعة.',
    invalid:'راجع جوابك أو قلْه مرة ثانية بعد سماع السؤال.', micUnavailable:'الميكروفون غير متاح هون. فيك تتابع كتابة، أو تفتح نفس الموقع في Safari أو Chrome وتسمح بالميكروفون.',
    channelUnavailable:'قناة الإرسال هذه غير مفعّلة. اختَر إحدى القنوات المتاحة إذا كانت تناسبك.',
    smsLimit:'نص الطلب طويل لرسالة SMS أو يحتوي رابطًا. اختصر التفاصيل واحذف الروابط.',
    error:'تعذّرت المتابعة. يمكنك الكتابة أو المحاولة لاحقًا.', limit:'وصلنا لحد الجلسات اليوم. يمكنك التواصل مباشرة مع الاستوديو.',
    expired:'انتهت جلسة الطلب قبل الإرسال. افتح طلبًا جديدًا إذا أردت المتابعة.',
    mailBusy:'خدمة البريد طلبت الانتظار. تعذّر إكمال إرسال الطلب الآن.',
    mailRejected:'خدمة البريد رفضت الإرسال. تواصل مع الاستوديو لمتابعة طلبك.',
    sending:'عم نرسل طلبك عبر', accepted:'وصل طلبك لخدمة الإرسال عبر', delivered:'وصل طلبك لحمدي عبر',
    receiptTitle:'ملخص طلبك', cancelled:'تم إلغاء الطلب قبل الإرسال.',
    unknown:'لم نتمكن من تأكيد الإرسال. تواصل مع الاستوديو قبل إعادة الطلب لتجنب تكراره.',
    reference:'رقم الطلب', qService:'شو الخدمة اللي بدك ياها؟ تعديل ألوان، تخرج، تصوير الحلاقة، أو صور جواز وهويات؟', qName:'شو اسمك؟',
    qChannel:'بأي طريقة بدك المساعد يرسل طلبك لحمدي؟ اختار من القنوات المتاحة.',
    qPhone:'قول رقمك رقم رقم، أو اكتبه بالخانة.', qEmail:'حتى يقدر حمدي يتواصل معك، قول رقم هاتفك رقم رقم، أو أعطينا بريدك الإلكتروني.',
    qWhen:'أي يوم ووقت بتفضّل؟ إذا بدك نتفق بعدين، قول «بدون موعد».'
  },
  tr:{
    title:'Hamdi ile talebin', intro:'Gönderim kanalını sesle seç. Yanıtların tamamlanınca asistan talebini otomatik gönderir, özeti ve talep numarasını gösterir.',
    privacy:'Sesli talebi başlattığında Cloudflare yanıtlarını metne dönüştürür. Kanalı sesle seçtiğinde, ayrıntılar tamamlanınca o kanalla gönderilmesine izin verirsin. Gönderimden önce “talebi iptal et” diyebilirsin.',
    start:'Sesli talebi başlat', typed:'Yazarak devam et', mute:'Mikrofonu kapat', replay:'Soruyu dinle', close:'Kapat',
    service:'Hizmet', name:'Adın', channel:'Talebin Hamdi’ye iletileceği kanal', contact:'Telefon veya e-posta', when:'Önerilen zaman (isteğe bağlı)', notes:'Notlar (isteğe bağlı)',
    choose:'Seç', next:'İleri', skip:'Zamanı sonra kararlaştıralım', review:'Onaylamadan önce ayrıntıları ve gönderim kanalını incele.',
    send:'Talebi gönder', pending:'Bu bir planlama talebidir. Zamanı ve fiyatı Hamdi görüşmeden sonra onaylar.',
    speaking:'Soruyu okuyorum…', listening:'Dinliyorum…', processing:'Yanıtın anlaşılıyor…', typedHint:'Yanıtını yazarak devam edebilirsin.',
    invalid:'Yanıtı kontrol et veya soruyu dinleyip tekrar söyle.', micUnavailable:'Mikrofon burada kullanılamıyor. Yazarak devam edebilir veya aynı siteyi Safari ya da Chrome’da açıp mikrofona izin verebilirsin.',
    channelUnavailable:'Bu gönderim kanalı etkin değil. Sana uygunsa kullanılabilir bir kanal seç.',
    smsLimit:'SMS için metin fazla uzun veya bağlantı içeriyor. Ayrıntıları kısalt ve bağlantıları kaldır.',
    error:'Devam edilemedi. Yazabilir veya daha sonra deneyebilirsin.', limit:'Bugünkü oturum sınırına ulaşıldı. Stüdyoyla doğrudan iletişim kurabilirsin.',
    expired:'Talep gönderilmeden oturum sona erdi. Devam etmek için yeni bir talep aç.',
    mailBusy:'E-posta hizmeti beklemeyi istedi. Talep şu anda gönderilemedi.',
    mailRejected:'E-posta hizmeti gönderimi reddetti. Talebin için stüdyoyla iletişime geç.',
    sending:'Talep şu kanalla gönderiliyor:', accepted:'Gönderim sağlayıcısı talebini aldı:', delivered:'Talep Hamdi’ye şu kanalla teslim edildi:',
    receiptTitle:'Talep özeti', cancelled:'Talep gönderilmeden iptal edildi.',
    unknown:'Gönderim doğrulanamadı. Tekrarlamadan önce stüdyoyla iletişime geç.',
    reference:'Talep numarası', qService:'Hangi hizmeti istiyorsun? Renk düzenleme, mezuniyet, berber çekimi veya pasaport ve kimlik fotoğrafı?', qName:'Adın nedir?',
    qChannel:'Asistan talebini Hamdi’ye nasıl göndersin? Kullanılabilir kanallardan birini seç.',
    qPhone:'Telefon numaranı rakam rakam söyle veya kutuya yaz.', qEmail:'Hamdi sana ulaşabilsin diye telefon numaranı rakam rakam söyle veya e-posta adresini ver.',
    qWhen:'Hangi gün ve saati tercih edersin? İstersen “zamanı sonra kararlaştıralım” de.'
  }
};
const orderFields = ['service','name','channel','contact','when'];
const orderChannels = ['email','sms'];
const chunkMs = 32;
const maxAnswerBytes = 480000;

async function fetchOrder(url, timeout, options = {}, controller = new AbortController()) {
  const timer = setTimeout(()=>controller.abort(),timeout);
  try {
    const response = await fetch(url,{...options,signal:controller.signal});
    return {response,result:await response.json()};
  } finally {
    clearTimeout(timer);
  }
}

class OrderAssistant {
  constructor({ getLanguage, stopOtherVoice, onState }) {
    Object.assign(this,{getLanguage,stopOtherVoice,onState,enabled:false,run:0,captureRun:0,turnRun:0,channels:{}});
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'order-dialog';
    this.dialog.id = 'order-dialog';
    this.dialog.setAttribute('aria-labelledby','order-title');
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel',event=>{
      event.preventDefault();
      if (!this.sending) this.close();
    });
    window.addEventListener('pagehide',()=>this.close());
    document.addEventListener('visibilitychange',()=>{
      if (document.hidden) {
        this.cancelRecording();
        this.stopPrompt();
      }
    });
  }

  async configure() {
    try {
      const {response,result} = await fetchOrder('/api/order/status',5000);
      this.channels = Object.fromEntries(orderChannels.map(key=>[key,result.channels?.[key] === true]));
      this.enabled = response.ok && result.enabled === true && Object.values(this.channels).some(Boolean);
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  get c() { return orderCopy[this.language === 'tr' ? 'tr' : 'ar']; }
  field(key) { return this.dialog.querySelector('[name="'+key+'"]'); }
  el(id) { return this.dialog.querySelector('#order-'+id); }
  channelLabel(channel) {
    if (channel === 'email') return this.language === 'tr' ? 'E-posta' : 'البريد الإلكتروني';
    return channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
  }
  setPhase(phase, message) {
    this.dialog.dataset.phase = phase;
    this.el('status').textContent = message || '';
    this.onState?.(phase === 'listening' ? 'listening' : phase === 'speaking' ? 'speaking' : 'ready');
  }

  stopPrompt() {
    this.promptRun = (this.promptRun || 0)+1;
    clearTimeout(this.promptTimer);
    if (this.promptAudio) {
      const audio = this.promptAudio;
      audio.onplaying = audio.onended = audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (this.dialog.dataset) this.dialog.dataset.promptState = 'stopped';
  }

  speak(key, after) {
    this.stopPrompt();
    this.currentPrompt = key;
    const url = orderPromptUrl(this.language,key);
    if (!url || !this.dialog.open || !window.Audio) {
      after?.();
      return;
    }
    const run = this.promptRun;
    const audio = this.promptAudio ||= new window.Audio();
    audio.src = url;
    this.dialog.dataset.promptState = 'loading';
    let finished = false;
    const complete = state=>{
      if (finished || run !== this.promptRun) return;
      finished = true;
      clearTimeout(this.promptTimer);
      if (state === 'unavailable') audio.pause();
      this.dialog.dataset.promptState = state;
      after?.();
    };
    this.promptTimer = setTimeout(()=>complete('unavailable'),14000);
    audio.onplaying = ()=>{
      if (finished || run !== this.promptRun) return;
      this.dialog.dataset.promptState = 'playing';
      clearTimeout(this.promptTimer);
      this.promptTimer = setTimeout(()=>complete('unavailable'),20000);
    };
    audio.onended = ()=>complete('ended');
    audio.onerror = ()=>complete('unavailable');
    audio.play().catch(()=>complete('unavailable'));
  }

  unlockPromptAudio() {
    if (!window.Audio) return;
    const audio = this.promptAudio ||= new window.Audio();
    const silence = orderWav([new Uint8Array(640)]);
    audio.src = 'data:audio/wav;base64,'+btoa(String.fromCharCode(...silence));
    audio.play().catch(()=>{});
  }

  canRecord() {
    return Boolean(window.AudioContext && window.AudioWorkletNode && navigator.mediaDevices?.getUserMedia
      && (document.permissionsPolicy || document.featurePolicy)?.allowsFeature?.('microphone') !== false);
  }

  open(service = '') {
    if (!this.enabled) return;
    this.stopOtherVoice();
    this.close();
    this.language = this.getLanguage();
    this.stage = -1;
    this.sending = false;
    const c = this.c, tr = this.language === 'tr';
    const services = tr
      ? ['Fotoğraf renk düzenleme','Mezuniyet çekimi','Berber ve saç kesimi çekimi','Pasaport ve kimlik fotoğrafları']
      : ['تعديل ألوان الصور','تصوير التخرج','تصوير الحلاقة وقصّات الشعر','صور الجواز والهويات'];
    const options = ['color','graduation','hair','id'].map((key,i)=>'<option value="'+key+'">'+services[i]+'</option>').join('');
    const channels = orderChannels.filter(key=>this.channels[key])
      .map(key=>'<option value="'+key+'">'+this.channelLabel(key)+'</option>').join('');
    this.dialog.innerHTML = [
      '<button type="button" id="order-close" class="dialog-close" aria-label="'+c.close+'">×</button>',
      '<div class="order-avatar" aria-hidden="true"><div class="orb"><div class="orb-shine"></div>'+
        '<div class="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>',
      '<h2 id="order-title">'+c.title+'</h2><p>'+c.intro+'</p>',
      '<section id="order-consent"><p class="dialog-alert">'+c.privacy+
        (this.channels.email?(tr?' Web3Forms e-posta taleplerini 7 gün saklar.':' يحتفظ Web3Forms بتفاصيل طلبات البريد 7 أيام.'):'')+'</p>',
      '<button type="button" class="button primary" id="order-start">'+c.start+'</button>',
      '<button type="button" class="text-link" id="order-typed">'+c.typed+'</button></section>',
      '<form id="order-form" hidden><p id="order-question" class="order-question" aria-live="polite"></p>',
      '<button type="button" class="text-link" id="order-repeat">'+c.replay+'</button>',
      '<button type="button" class="text-link" id="order-mute" hidden>'+c.mute+'</button>',
      '<label data-order-field="service">'+c.service+'<select name="service" required><option value="">'+c.choose+'</option>'+options+'</select></label>',
      '<label data-order-field="name">'+c.name+'<input name="name" maxlength="100" autocomplete="name" required></label>',
      '<label data-order-field="channel">'+c.channel+'<select name="channel" required><option value="">'+c.choose+'</option>'+channels+'</select></label>',
      '<label data-order-field="contact"><span id="order-contact-label">'+c.contact+'</span><input name="contact" maxlength="120" required dir="auto"></label>',
      '<label data-order-field="when">'+c.when+'<input name="when" maxlength="160"></label>',
      '<label data-order-field="notes">'+c.notes+'<textarea name="notes" maxlength="500" rows="2"></textarea></label>',
      '<div class="order-step-tools" id="order-step-tools"><button type="button" class="button primary" id="order-next">'+c.next+'</button>',
      '<button type="button" class="text-link" id="order-skip">'+c.skip+'</button></div>',
      '<p>'+c.pending+'</p><button type="submit" class="button primary" id="order-send" hidden>'+c.send+'</button></form>',
      '<p id="order-status" role="status" aria-live="polite"></p>',
      '<section id="order-receipt" hidden><h3>'+c.receiptTitle+'</h3><dl id="order-summary"></dl><p>'+c.pending+'</p></section>'
    ].join('');
    this.el('close').onclick = ()=>{ if (!this.sending) this.close(); };
    this.el('start').onclick = ()=>this.start(true);
    this.el('typed').onclick = ()=>this.start(false);
    this.el('next').onclick = ()=>this.advance();
    this.el('skip').onclick = ()=>{
      this.field('when').value = '';
      this.review();
    };
    this.el('mute').onclick = ()=>{
      this.cancelRecording();
      this.setPhase('idle',c.typedHint);
    };
    this.el('repeat').onclick = ()=>{
      if (this.stage < 5) this.ask(this.currentPrompt);
      else this.speak('review');
    };
    this.el('form').oninput = event=>{
      if (this.sending) return;
      this.stopTurn();
      this.stopPrompt();
      if (event.target === this.field('channel')) {
        this.automaticChannel = '';
        this.updateContactField();
      }
      this.setPhase('idle');
    };
    this.el('form').onsubmit = event=>{
      event.preventDefault();
      if (this.stage < 5) this.advance();
      else this.send();
    };
    if (['color','graduation','hair','id'].includes(service)) this.field('service').value = service;
    this.setPhase('idle');
    this.dialog.showModal();
    if (!this.canRecord()) {
      this.el('start').hidden = true;
      this.setPhase('idle',c.micUnavailable);
    }
  }

  async start(withVoice) {
    if (this.starting) return;
    this.starting = true;
    this.el('start').disabled = this.el('typed').disabled = true;
    const run = this.run;
    try {
      if (withVoice && this.canRecord()) this.unlockPromptAudio();
      const mic = withVoice && await this.prepareMicrophone();
      if (run !== this.run || !this.dialog.open) return;
      const {response,result} = await fetchOrder('/api/order/session',10000,{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({language:this.language,consent:true})
      });
      if (run !== this.run || !this.dialog.open) return;
      if (!response.ok) throw new Error(result.error);
      this.token = result.token;
      this.el('consent').hidden = true;
      this.el('form').hidden = false;
      this.el('mute').hidden = !this.stream;
      this.stage = this.field('service').value ? 1 : 0;
      this.showStep(mic && Boolean(this.stream));
      if (withVoice && !mic) this.setPhase('idle',this.c.micUnavailable);
    } catch(error) {
      if (run !== this.run) return;
      this.cancelRecording();
      this.setPhase('idle',error.message === 'order-limit' ? this.c.limit : this.c.error);
      this.el('start').disabled = this.el('typed').disabled = false;
    } finally {
      if (run === this.run) this.starting = false;
    }
  }

  updateContactField() {
    const email = this.field('channel').value === 'email';
    const tr = this.language === 'tr';
    this.el('contact-label').textContent = email ? this.c.contact : (tr?'Telefon numaran':'رقم هاتفك');
    this.field('contact').inputMode = email ? 'text' : 'tel';
  }

  showStep(play = Boolean(this.stream)) {
    const key = orderFields[this.stage];
    this.dialog.querySelectorAll('[data-order-field]').forEach(el=>{ el.hidden = el.dataset.orderField !== key; });
    this.el('skip').hidden = key !== 'when';
    if (key === 'contact') this.updateContactField();
    const prompt = key === 'contact' ? (this.field('channel').value === 'email' ? 'email' : 'phone') : key;
    const copyKey = {service:'qService',name:'qName',channel:'qChannel',email:'qEmail',phone:'qPhone',when:'qWhen'}[prompt];
    this.el('question').textContent = this.c[copyKey];
    this.currentPrompt = prompt;
    if (play) this.ask(prompt);
    else this.setPhase('idle');
  }

  ask(prompt) {
    this.stopTurn();
    this.setPhase('speaking',this.c.speaking);
    this.speak(prompt,()=>{
      if (this.stream) this.listenForAnswer();
      else this.setPhase('idle');
    });
  }

  validField(key) {
    const value = this.field(key).value.trim();
    if (key === 'service') return ['color','graduation','hair','id'].includes(value);
    if (key === 'channel') return this.channels[value] === true;
    if (key === 'name') return Boolean(value);
    if (key === 'contact') return Boolean(orderContact(value,this.field('channel').value));
    return true;
  }

  advance() {
    const key = orderFields[this.stage];
    if (!key || !this.validField(key)) {
      this.setPhase('idle',this.c.invalid);
      return;
    }
    this.stopTurn();
    this.stopPrompt();
    this.repeats = 0;
    if (key === 'contact') this.field('contact').value = orderContact(this.field('contact').value,this.field('channel').value);
    this.stage++;
    if (this.stage === orderFields.length) this.review();
    else this.showStep();
  }

  review() {
    const automatically = Boolean(this.stream && this.automaticChannel
      && this.automaticChannel === this.field('channel').value);
    this.stage = orderFields.length;
    this.cancelRecording();
    this.dialog.querySelectorAll('[data-order-field]').forEach(el=>{ el.hidden = false; });
    this.el('step-tools').hidden = true;
    this.el('send').hidden = automatically;
    this.el('repeat').hidden = automatically;
    this.el('question').textContent = automatically ? this.c.receiptTitle : this.c.review;
    this.setPhase('review');
    if (automatically) this.send();
    else this.speak('review');
  }

  async prepareMicrophone() {
    if (!this.canRecord()) return false;
    const run = this.run, capture = ++this.captureRun;
    const current = ()=>run === this.run && capture === this.captureRun && !document.hidden && this.dialog.open;
    let resumeTimer;
    try {
      const audio = new window.AudioContext();
      this.audio = audio;
      // Mobile browsers need resume() to be requested during the Start tap.
      const activated = audio.resume().then(()=>true,()=>false);
      const stream = await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if (!current()) {
        stream.getTracks().forEach(track=>track.stop());
        return false;
      }
      this.stream = stream;
      this.enableTracks(false);
      const resumed = await Promise.race([activated,new Promise(resolve=>{
        resumeTimer = setTimeout(()=>resolve(false),2500);
      })]);
      if (!current()) return false;
      if (!resumed) throw new Error('audio-suspended');
      await audio.audioWorklet.addModule(new URL('./microphone.js?v=mobile-audio-20261110',location.href).href);
      if (!current()) return false;
      this.source = audio.createMediaStreamSource(stream);
      this.worklet = new window.AudioWorkletNode(audio,'hamdi-microphone',{processorOptions:{outputRate:16000}});
      this.silence = audio.createGain();
      this.silence.gain.value = 0;
      this.worklet.port.onmessage = event=>this.receiveAudio(new Uint8Array(event.data));
      this.source.connect(this.worklet);
      this.worklet.connect(this.silence);
      this.silence.connect(audio.destination);
      return true;
    } catch {
      if (current()) this.cancelRecording();
      return false;
    } finally {
      clearTimeout(resumeTimer);
    }
  }

  enableTracks(enabled) {
    this.stream?.getAudioTracks().forEach(track=>{ track.enabled = enabled; });
  }

  listenForAnswer() {
    if (!this.stream || !this.dialog.open || document.hidden || !orderFields[this.stage]) return;
    this.stopTurn();
    this.turn = {chunks:[],lead:[],hits:0,quietMs:0,bytes:0,noise:0.003};
    this.enableTracks(true);
    this.setPhase('listening',this.c.listening);
    this.turnTimer = setTimeout(()=>{
      if (this.turn?.bytes) this.finishRecording();
      else {
        this.cancelRecording();
        this.setPhase('idle',this.c.typedHint);
      }
    },15000);
  }

  receiveAudio(chunk) {
    const turn = this.turn;
    if (!turn) return;
    const samples = new DataView(chunk.buffer,chunk.byteOffset,chunk.byteLength);
    let energy = 0;
    for (let i=0;i<chunk.length;i+=2) energy += (samples.getInt16(i,true)/32768)**2;
    const rms = Math.sqrt(energy/(chunk.length/2));
    const voiced = rms >= Math.max(0.008,Math.min(0.04,turn.noise*2.8));
    if (!turn.bytes) {
      turn.lead.push(chunk);
      if (turn.lead.length > 10) turn.lead.shift();
      turn.hits = voiced ? turn.hits+1 : 0;
      if (!voiced) turn.noise = turn.noise*0.9+rms*0.1;
      if (turn.hits < 3) return;
      turn.chunks = turn.lead;
      turn.bytes = turn.lead.reduce((total,part)=>total+part.length,0);
      return;
    }
    if (turn.bytes+chunk.length > maxAnswerBytes) {
      this.finishRecording();
      return;
    }
    turn.chunks.push(chunk);
    turn.bytes += chunk.length;
    turn.quietMs = voiced ? 0 : turn.quietMs+chunkMs;
    // Keep turn detection below one second, including for a dictated number.
    if (turn.quietMs >= (orderFields[this.stage] === 'contact' ? 864 : 672)) this.finishRecording();
  }

  stopTurn() {
    this.turnRun = (this.turnRun || 0)+1;
    clearTimeout(this.turnTimer);
    this.turn = null;
    this.enableTracks(false);
    this.transcription?.abort();
    this.transcription = null;
  }

  cancelRecording() {
    this.automaticChannel = '';
    this.captureRun = (this.captureRun || 0)+1;
    this.stopTurn();
    this.stream?.getTracks().forEach(track=>track.stop());
    this.stream = null;
    if (this.worklet) this.worklet.port.onmessage = null;
    this.source?.disconnect();
    this.worklet?.disconnect();
    this.silence?.disconnect();
    this.audio?.close().catch(()=>{});
    this.audio = this.source = this.worklet = this.silence = null;
    const mute = this.el('mute');
    if (mute) mute.hidden = true;
  }

  async finishRecording() {
    const chunks = this.turn?.chunks;
    this.stopTurn();
    if (!chunks?.length) return;
    const turn = this.turnRun, run = this.run, key = orderFields[this.stage];
    const controller = new AbortController();
    this.transcription = controller;
    const current = ()=>run === this.run && turn === this.turnRun && this.dialog.open && !document.hidden;
    this.setPhase('processing',this.c.processing);
    try {
      const {response,result} = await fetchOrder('/api/order/transcribe',15000,{
        method:'POST',headers:{'content-type':'audio/wav',authorization:'Bearer '+this.token},
        body:orderWav(chunks)
      },controller);
      if (!current()) return;
      if (!response.ok) throw new Error(result.error);
      const transcript = normalizedOrderReply(result.text);
      if (isOrderCancellation(transcript)) {
        this.cancelRecording();
        this.stopPrompt();
        this.token = '';
        this.stage = -1;
        this.el('form').hidden = true;
        this.setPhase('idle',this.c.cancelled);
        return;
      }
      let value = result.text;
      if (key === 'service') value = orderService(value);
      if (key === 'channel') value = orderChannel(value);
      if (key === 'contact') value = orderContact(value,this.field('channel').value) || value;
      if (key === 'when' && /بدون موعد|بلا موعد|نتفق لاحقا|نتفق بعدين|sonra kararlaştıralım|zaman fark etmez/i.test(transcript)) value = '';
      if (key === 'channel' && value && !this.channels[value]) {
        this.repeatAnswer(this.c.channelUnavailable);
        return;
      }
      this.field(key).value = value;
      if (!this.validField(key)) {
        this.repeatAnswer();
        return;
      }
      if (key === 'channel') this.automaticChannel = value;
      this.advance();
    } catch(error) {
      if (!current()) return;
      if (error.message === 'no-speech') this.repeatAnswer();
      else {
        this.cancelRecording();
        this.setPhase('idle',error.message === 'order-limit' ? this.c.limit : this.c.error);
      }
    }
  }

  repeatAnswer(message = this.c.invalid) {
    this.repeats = (this.repeats || 0)+1;
    if (this.repeats < 2 && this.stream) this.listenForAnswer();
    else {
      this.cancelRecording();
      this.setPhase('idle');
    }
    this.el('status').textContent = message+(this.stream?' '+this.c.listening:' '+this.c.typedHint);
  }

  showReceipt(data, id) {
    const c = this.c;
    const rows = [
      [c.reference,id],
      [c.service,this.field('service').selectedOptions[0]?.textContent],
      [c.name,data.name],
      [c.channel,this.channelLabel(data.channel)],
      [this.el('contact-label').textContent,data.contact],
      [c.when,data.when],
      [c.notes,data.notes]
    ];
    const summary = this.el('summary');
    summary.replaceChildren();
    for (const [label,value] of rows) {
      if (!value) continue;
      const term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      detail.dir = 'auto';
      summary.append(term,detail);
    }
    this.el('receipt').hidden = false;
  }

  async send() {
    if (this.sending || this.stage !== orderFields.length) return;
    if (!this.el('form').reportValidity()) {
      this.el('send').hidden = false;
      return;
    }
    for (const key of ['service','name','channel','contact']) {
      if (this.validField(key)) continue;
      this.field(key).focus();
      this.setPhase('review',this.c.invalid);
      this.el('send').hidden = false;
      return;
    }
    const data = Object.fromEntries(new FormData(this.el('form')));
    data.contact = orderContact(data.contact,data.channel);
    Object.assign(data,{language:this.language,confirmed:true});
    this.stopPrompt();
    this.sending = this.el('send').disabled = this.el('close').disabled = true;
    const run = this.run;
    this.setPhase('processing',this.c.sending+' '+this.channelLabel(data.channel));
    try {
      const {response,result} = await fetchOrder('/api/order/send',35000,{
        method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+this.token},
        body:JSON.stringify(data)
      });
      if (run !== this.run) return;
      if (result.error === 'order-limit' || result.error === 'session-required') {
        this.setPhase('idle',result.error === 'order-limit' ? this.c.limit : this.c.expired);
        this.el('send').hidden = true;
        return;
      }
      if (result.error === 'mail-rate-limited' || result.error === 'mail-server-rejected') {
        this.setPhase('idle',result.error === 'mail-rate-limited' ? this.c.mailBusy : this.c.mailRejected);
        this.el('send').hidden = true;
        return;
      }
      if (result.error === 'channel-unavailable' || result.error === 'sms-content-limit') {
        this.setPhase('review',result.error === 'channel-unavailable' ? this.c.channelUnavailable : this.c.smsLimit);
        this.el('send').disabled = false;
        this.el('send').hidden = false;
        return;
      }
      if (!response.ok || result.accepted !== true || result.channel !== data.channel) throw new Error('unconfirmed');
      this.stage++;
      this.el('form').hidden = true;
      const delivered = result.state === 'delivered';
      const status = delivered ? this.c.delivered : this.c.accepted;
      this.setPhase('review',status+' '+this.channelLabel(result.channel)+'.');
      this.showReceipt(data,result.id);
      this.speak(delivered?'delivered':'received');
    } catch {
      if (run !== this.run) return;
      this.setPhase('idle',this.c.unknown);
      this.el('send').hidden = true;
    } finally {
      if (run === this.run) {
        this.sending = false;
        this.el('close').disabled = false;
      }
    }
  }

  close() {
    this.run++;
    this.starting = false;
    this.repeats = 0;
    this.cancelRecording();
    this.stopPrompt();
    this.promptAudio = null;
    if (this.dialog.open) this.dialog.close();
    this.token = '';
    this.dialog.innerHTML = '';
  }
}


const copy = {
  ar: {
    skip:'انتقل للمحتوى', preview:'معاينة خاصة · غير منشورة', kicker:'مكتب استقبال الاستوديو', title:'اسأل براحتك.<br><em>والطلب بيوصل.</em>', intro:'تعرّف على خدمات Hamdi Photography، ثم جهّز طلب جلستك وراجعه قبل إرساله إلى بريد الاستوديو عبر Gmail.', requestAction:'جهّز طلب جلسة ↙', servicesAction:'شوف الخدمات الأربع', note1:'عربي · Türkçe', note2:'أنت تراجع وترسل', note3:'الموعد بتأكيد الاستوديو', unavailable:'قيد الإعداد', voiceKicker:'مساعد الاستوديو الصوتي', voiceTitle:'أهلًا، أنا حمدي AI.', voiceDescription:'أسئلة عن الخدمات؟ المحادثة للمعلومات العامة، وطلبك الشخصي إله نموذج مستقل.', talkAction:'تحدّث مع حمدي AI', voiceOffline:'الصوت غير مفعّل بالمعاينة. نموذج الطلب يعمل بشكل مستقل.', voiceReady:'يمكن بدء تجربة صوتية لمدة دقيقتين. التفعيل الفعلي يحتاج تجربة ناجحة.', mute:'كتم الميكروفون', unmute:'تشغيل الميكروفون', endCall:'إنهاء المحادثة', servicesKicker:'أربع خدمات. اختيار واضح.', servicesTitle:'شو حابب نصوّر؟', noPrices:'التفاصيل والأسعار تُنسّق مباشرة مع الاستوديو.', colorDesc:'تعديل الإضاءة والألوان لصورك الرقمية.', graduationDesc:'للشخص واللحظة اللي بدك تتذكّرها.', hairDesc:'تفاصيل القصّة والملمس من الزاوية المناسبة.', idDesc:'صور شخصية بحسب متطلبات معاملتك.', requestKicker:'من هون بيبدأ التنسيق', requestTitle:'طلبك مرتب.<br><em>وكله قدامك.</em>', requestIntro:'اختر الخدمة واكتب التفاصيل المهمة. سنجهّز لك رسالة، وأنت تقرّر متى ترسلها.', step1:'املأ الطلب', step2:'راجع الرسالة', step3:'أرسلها داخل Gmail', studioPhone:'رقم الاستوديو', formPrivacy:'هذه البيانات لا تُرسل للمساعد الصوتي، ولا تُحفظ بعد إغلاق الصفحة. تنتقل إلى Gmail فقط عندما تفتح الرسالة.', formTitle:'طلب جلسة', formTag:'موعد مقترح، غير مؤكد', serviceLabel:'الخدمة المطلوبة *', chooseService:'اختر الخدمة', nameLabel:'اسمك *', namePlaceholder:'كيف نناديك؟', phoneLabel:'رقم تواصل (اختياري)', dateLabel:'التاريخ المقترح (اختياري)', timeLabel:'الوقت المقترح (اختياري)', notesLabel:'تفاصيل إضافية (اختياري)', notesPlaceholder:'اكتب اللي بيساعدنا ننسّق جلستك…', reviewAction:'راجع الطلب قبل الإرسال', formNote:'ما في إرسال تلقائي. تأكيد الموعد بيجيك من الاستوديو.', faqKicker:'تفاصيل بتهمّك', faqTitle:'قبل ما ترسل.', faq1:'هل الطلب بيأكد الموعد؟', faq1Answer:'لا. الطلب بداية للتنسيق فقط، والاستوديو بيأكد معك الوقت والتفاصيل مباشرة.', faq2:'وين بتوصل معلوماتي؟', faq2Answer:'النموذج يجهّز رسالة على جهازك. لما تفتح Gmail، بتظهر التفاصيل هناك، ولازم تضغط إرسال بنفسك. المعلومات ما بتروح للمساعد الصوتي.', faq3:'هل في أسعار ثابتة؟', faq3Answer:'ما في أسعار ثابتة معروضة. الاستوديو بيوضّح السعر بعد معرفة تفاصيل طلبك.', ownerTitle:'ملاحظة صاحب المعاينة', ownerNote:'هذه نسخة للمراجعة، ولم تُنشر أو ترتبط بالموقع العام. مسار Gmail يعمل؛ الصوت يحتاج إعداد مفتاح Gemini والتحقق من الحصة المجانية وتجربة حقيقية قبل إطلاقه للزبائن.', footerNote:'طلب واضح. وتنسيق مباشر.', reviewKicker:'الخطوة الأخيرة عندك', reviewTitle:'هاي رسالتك للاستوديو.', reviewIntro:'تأكد من التفاصيل. فتح Gmail ما يعني أنه تم إرسال الطلب.', reviewWarning:'داخل Gmail، اضغط «إرسال» ليصل الطلب. الموعد يحتاج تأكيد الاستوديو.', openGmail:'افتح الطلب في Gmail ↗', copyMessage:'انسخ الرسالة', editMessage:'ارجع وعدّل', consentTitle:'قبل ما نبدأ الصوت.', consentIntro:'المساعد آلي، ومخصص للأسئلة العامة عن خدمات التصوير. لا تذكر اسمك أو هاتفك أو أي بيانات شخصية؛ استخدم نموذج الطلب لها.', providerNotice:'الصوت ينتقل إلى خدمة Google. في الخطة المجانية قد تُستخدم المحادثة لتحسين منتجاتها. تشترط خدمة الصوت من Google أن يكون عمرك 18 سنة أو أكثر.', adultConsent:'عمري 18 سنة أو أكثر.', audioConsent:'أوافق على إرسال صوتي إلى خدمة Google لهذه المحادثة.', voiceLimit:'المعاينة تحدد المحادثة بدقيقتين، ولا تجمع بيانات الحجز بالصوت.', startVoice:'ابدأ المحادثة', skipVoice:'انتقل مباشرة لطلب جلسة', voiceDisabled:'المحادثة الصوتية ليست مفعّلة بعد. يمكنك استخدام نموذج الطلب مباشرة.', copied:'تم نسخ الرسالة.', copyFailed:'تعذّر النسخ التلقائي. يمكنك تحديد نص الرسالة ونسخه يدويًا.', openedDraft:'بعد فتح Gmail، راجع الرسالة واضغط إرسال. لم نؤكّد وصولها أو الموعد.', errorService:'اختر إحدى الخدمات الأربع.', errorName:'اكتب الاسم أولًا.', errorDate:'اختر تاريخًا صحيحًا غير سابق لليوم. الوقت يحتاج تاريخًا أيضًا.', errorPhone:'تحقق من رقم التواصل أو اتركه فارغًا.', errorTime:'تحقق من الوقت المقترح.', close:'إغلاق', connecting:'جاري تجهيز اتصال الصوت…', listening:'الميكروفون يعمل — تفضّل، عم اسمعك.', speaking:'حمدي AI يردّ بالصوت. فيك تقاطعه.', muted:'الميكروفون مكتوم.', ended:'انتهت المحادثة، وتوقف الميكروفون.', limit:'انتهت مدة التجربة. فيك تكمل طلبك بالنموذج.', permission:'لم يُسمح باستخدام الميكروفون. يمكنك متابعة الطلب كتابةً.', unsupported:'المتصفح لا يدعم هذه المحادثة الصوتية. استخدم النموذج أو متصفحًا حديثًا.', quota:'وصلت التجربة لحدّ الاستخدام. نموذج الطلب ما زال متاحًا.', voiceError:'تعذّر بدء المحادثة الصوتية. جرّب لاحقًا أو أكمل بالنموذج.', active:'محادثة جارية', ready:'جاهز للتجربة', draftService:'الخدمة المختارة'
  },
  tr: {
    skip:'İçeriğe geç', preview:'Özel ön izleme · Yayınlanmadı', kicker:'STÜDYO KARŞILAMA MASASI', title:'Rahatça sor.<br><em>Talebin ulaşsın.</em>', intro:'Hamdi Photography hizmetlerini keşfet. Çekim talebini hazırla, gözden geçir ve stüdyoya Gmail üzerinden kendin gönder.', requestAction:'Çekim talebi hazırla ↘', servicesAction:'Dört hizmeti keşfet', note1:'Türkçe · عربي', note2:'Sen inceler ve gönderirsin', note3:'Randevu stüdyo onayıyla', unavailable:'Hazırlanıyor', voiceKicker:'STÜDYONUN SESLİ ASİSTANI', voiceTitle:'Merhaba, ben Hamdi AI.', voiceDescription:'Hizmetlerle ilgili soruların mı var? Genel bilgi için konuş; kişisel talebini ayrı formdan ilet.', talkAction:'Hamdi AI ile konuş', voiceOffline:'Ön izlemede ses etkin değil. Talep formunu kullanabilirsin.', voiceReady:'İki dakikalık ses denemesi başlatılabilir. Gerçek bağlantı henüz doğrulanmadı.', mute:'Mikrofonu kapat', unmute:'Mikrofonu aç', endCall:'Konuşmayı bitir', servicesKicker:'DÖRT HİZMET. NET BİR SEÇİM.', servicesTitle:'Ne çekelim?', noPrices:'Ayrıntılar ve fiyatlar doğrudan stüdyoyla netleştirilir.', colorDesc:'Dijital fotoğraflarında ışık ve renk düzenleme.', graduationDesc:'Hatırlamak istediğin kişi ve an için.', hairDesc:'Kesimin ve dokunun doğru açıdan detayları.', idDesc:'İşleminin gerekliliklerine uygun kişisel fotoğraflar.', requestKicker:'PLANLAMA BURADA BAŞLAR', requestTitle:'Talebin düzenli.<br><em>Her şey önünde.</em>', requestIntro:'Hizmeti seç ve önemli ayrıntıları yaz. Mesajını hazırlayalım; ne zaman göndereceğine sen karar ver.', step1:'Formu doldur', step2:'Mesajı incele', step3:'Gmail’de gönder', studioPhone:'Stüdyo telefonu', formPrivacy:'Bu bilgiler sesli asistana gönderilmez ve sayfa kapatılınca saklanmaz. Yalnızca mesajı açtığında Gmail’e aktarılır.', formTitle:'Çekim talebi', formTag:'Önerilen zaman; henüz onaylı değil', serviceLabel:'İstediğin hizmet *', chooseService:'Bir hizmet seç', nameLabel:'Adın *', namePlaceholder:'Sana nasıl hitap edelim?', phoneLabel:'İletişim numarası (isteğe bağlı)', dateLabel:'Önerilen tarih (isteğe bağlı)', timeLabel:'Önerilen saat (isteğe bağlı)', notesLabel:'Ek ayrıntılar (isteğe bağlı)', notesPlaceholder:'Çekimi planlamamıza yardımcı olacak ayrıntılar…', reviewAction:'Göndermeden önce incele', formNote:'Otomatik gönderilmez. Randevuyu stüdyo onaylar.', faqKicker:'BİLMEN GEREKENLER', faqTitle:'Göndermeden önce.', faq1:'Talep, randevuyu kesinleştirir mi?', faq1Answer:'Hayır. Bu yalnızca bir planlama talebidir. Stüdyo zaman ve ayrıntıları seninle doğrudan netleştirir.', faq2:'Bilgilerim nereye gider?', faq2Answer:'Form, mesajı cihazında hazırlar. Gmail’i açınca ayrıntılar orada görünür; Gönder düğmesine kendin basmalısın. Bilgiler sesli asistana gönderilmez.', faq3:'Sabit fiyat var mı?', faq3Answer:'Sabit fiyat gösterilmiyor. Stüdyo, talebinin ayrıntılarına göre fiyatı seninle netleştirir.', ownerTitle:'Ön izleme sahibi için not', ownerNote:'Bu inceleme sürümü yayınlanmadı ve genel siteye bağlanmadı. Gmail akışı çalışır; ses için Gemini anahtarı, ücretsiz kota kontrolü ve müşterilere açmadan önce gerçek bir test gerekir.', footerNote:'Net talep. Doğrudan iletişim.', reviewKicker:'SON ADIM SENDE', reviewTitle:'Stüdyoya mesajın burada.', reviewIntro:'Ayrıntıları kontrol et. Gmail’in açılması, mesajın gönderildiği anlamına gelmez.', reviewWarning:'Talebin ulaşması için Gmail’de Gönder’e bas. Randevu stüdyonun onayını gerektirir.', openGmail:'Talebi Gmail’de aç ↗', copyMessage:'Mesajı kopyala', editMessage:'Geri dön ve düzenle', consentTitle:'Ses başlamadan önce.', consentIntro:'Bu, fotoğraf hizmetleri hakkında genel bilgi sunan yapay zekâ asistanıdır. Adını, telefonunu veya kişisel bilgilerini söyleme; bunlar için ayrı formu kullan.', providerNotice:'Ses Google hizmetine aktarılır. Ücretsiz planda konuşma, ürünlerini geliştirmek için kullanılabilir. Google sesli hizmeti, 18 yaşında veya daha büyük olmanı gerektirir.', adultConsent:'18 yaşında veya daha büyüğüm.', audioConsent:'Bu konuşma için sesimin Google hizmetine aktarılmasını kabul ediyorum.', voiceLimit:'Ön izleme konuşmayı iki dakikayla sınırlar. Rezervasyon bilgileri sesle toplanmaz.', startVoice:'Konuşmayı başlat', skipVoice:'Doğrudan çekim talebine geç', voiceDisabled:'Sesli görüşme henüz etkin değil. Talep formunu doğrudan kullanabilirsin.', copied:'Mesaj kopyalandı.', copyFailed:'Otomatik kopyalama başarısız. Metni seçip elle kopyalayabilirsin.', openedDraft:'Gmail açıldığında mesajı inceleyip Gönder’e bas. İletilme veya randevu onayı verilmedi.', errorService:'Dört hizmetten birini seç.', errorName:'Önce adını yaz.', errorDate:'Bugünden önce olmayan geçerli bir tarih seç. Saat için tarih de gerekir.', errorPhone:'Telefon numarasını kontrol et veya boş bırak.', errorTime:'Önerilen saati kontrol et.', close:'Kapat', connecting:'Ses bağlantısı hazırlanıyor…', listening:'Mikrofon açık — seni dinliyorum.', speaking:'Hamdi AI sesli yanıtlıyor. Sözünü kesebilirsin.', muted:'Mikrofon kapalı.', ended:'Konuşma bitti; mikrofon durduruldu.', limit:'Deneme süresi sona erdi. Formdan devam edebilirsin.', permission:'Mikrofon izni verilmedi. Yazılı formdan devam edebilirsin.', unsupported:'Tarayıcı sesli görüşmeyi desteklemiyor. Formu veya güncel bir tarayıcıyı kullan.', quota:'Deneme kullanım sınırına ulaştı. Talep formu hâlâ kullanılabilir.', voiceError:'Sesli görüşme başlatılamadı. Daha sonra dene veya formdan devam et.', active:'Görüşme sürüyor', ready:'Denemeye hazır', draftService:'Seçilen hizmet'
  }
};

Object.assign(copy.ar, { bookingAction:'طلب موعد عبر Gmail ↙', 'test-waiting':'جاري انتظار المقطع الصوتي…', 'test-speaking':'جاري تشغيل المقطع الصوتي.' });
Object.assign(copy.tr, { bookingAction:'Gmail ile randevu talebi ↘', 'test-waiting':'Ses örneği bekleniyor…', 'test-speaking':'Ses örneği oynatılıyor.' });
const delivery = document.documentElement.dataset.delivery;
for (const [locale,message] of [
  ['ar','الميكروفون غير متاح هون. فيك تفتح نفس الموقع في Safari أو Chrome وتسمح بالميكروفون، أو تتابع طلبك كتابة.'],
  ['tr','Mikrofon burada kullanılamıyor. Aynı siteyi Safari veya Chrome’da açıp izin verebilir ya da yazarak devam edebilirsin.']
]) {
  Object.assign(copy[locale],{permission:message,unsupported:message});
}
const pageOptions = new URLSearchParams(location.search);
const embeddedParent = pageOptions.get('parentOrigin');
const embedded = pageOptions.get('embed') === '1' && window.parent !== window
  && ['https://hamdihajiali3-cell.github.io', 'https://hamdi--photography.hamdihajiali3.workers.dev'].includes(embeddedParent);
if (embedded) {
  document.documentElement.dataset.embedded = 'true';
  Object.assign(copy.ar, { bookingAction:'طلب موعد ↙' });
  Object.assign(copy.tr, { bookingAction:'Randevu talebi ↘' });
}
const staticDelivery = delivery === 'static' || (delivery === 'hybrid' && location.hostname.endsWith('.github.io'));
if (delivery === 'hybrid' && !staticDelivery) {
  Object.assign(copy.ar, {
    preview:'المساعد الصوتي', ready:'جاهز للمحادثة',
    voiceReady:'اسأل عن الخدمات بالصوت، لمدة تصل إلى دقيقتين.',
    voiceOffline:'الصوت غير متاح حالياً. يمكنك استخدام نموذج الطلب.',
    voiceLimit:'مدة المحادثة دقيقتان. لإرسال تفاصيل الحجز، استخدم طلب موعد.',
    limit:'انتهت مدة المحادثة. فيك تكمل بطلب موعد.',
    quota:'وصل المساعد لحد الاستخدام اليوم. فيك تكمل بطلب موعد.',
    ownerTitle:'عن المساعد الصوتي',
    ownerNote:'اسأل المساعد عن خدمات التصوير الأربع. لتنسيق موعد، افتح طلب موعد.'
  });
  Object.assign(copy.tr, {
    preview:'Sesli asistan', ready:'Görüşmeye hazır',
    voiceReady:'Hizmetleri sesli sor; görüşme en fazla iki dakika sürer.',
    voiceOffline:'Ses şu anda kullanılamıyor. Talep formunu kullanabilirsin.',
    voiceLimit:'Görüşme iki dakika sürer. Rezervasyon bilgilerini randevu talebinden gönder.',
    limit:'Görüşme süresi doldu. Randevu talebiyle devam edebilirsin.',
    quota:'Asistan günlük kullanım sınırına ulaştı. Randevu talebiyle devam edebilirsin.',
    ownerTitle:'Sesli asistan hakkında',
    ownerNote:'Asistana dört fotoğraf hizmetini sorabilirsin. Tarih belirlemek için randevu talebi oluştur.'
  });
}
Object.assign(copy.ar, { testVoice:'اسمع صوت حمدي AI', testConsentIntro:'سنرسل نصاً تعريفياً عاماً إلى Google ونشغّل المقطع الصوتي. يمكنك سماعه بدون فتح الميكروفون.', testAudioConsent:'أوافق على طلب المقطع الصوتي من Google وتشغيله.', testStart:'شغّل المقطع الصوتي', 'test-complete':'انتهى تشغيل المقطع الصوتي.', 'provider-auth':'تعذر التحقق من خدمة الصوت. يمكنك متابعة الطلب بالنموذج.', 'provider-model':'خدمة الصوت تحتاج مراجعة إعدادها. يمكنك استخدام نموذج الطلب.', 'provider-network':'تعذر الاتصال الصوتي. حاول لاحقاً أو استخدم نموذج الطلب.' });
Object.assign(copy.tr, { testVoice:'Hamdi AI sesini dinle', testConsentIntro:'Google’a genel bir tanıtım metni gönderilir ve ses örneği oynatılır. Dinlerken mikrofonun kapalı kalır.', testAudioConsent:'Google’dan ses örneğinin istenmesini ve oynatılmasını kabul ediyorum.', testStart:'Ses örneğini oynat', 'test-complete':'Ses örneği tamamlandı.', 'provider-auth':'Sesli hizmet doğrulanamadı. Talep formundan devam edebilirsin.', 'provider-model':'Sesli hizmetin ayarları incelenmeli. Talep formunu kullanabilirsin.', 'provider-network':'Ses bağlantısı kurulamadı. Daha sonra dene veya formu kullan.' });
if (staticDelivery) {
  Object.assign(copy.ar, {
    preview:'نسخة تجريبية', title:'اختار جلستك.<br><em>وجهّز طلبك.</em>',
    voiceDescription:'المساعد الصوتي قيد الإعداد. يمكنك الآن تجهيز طلب جلسة ومراجعته عبر النموذج.',
    talkAction:'الصوت قيد الإعداد', voiceOffline:'المحادثة الصوتية غير مفعّلة حالياً. جهّز طلبك من النموذج أدناه.',
    ownerTitle:'عن هذه النسخة', ownerNote:'يمكنك تجهيز طلب جلسة ومراجعته قبل فتح Gmail. إرسال الرسالة يتم بواسطتك، ويؤكد الاستوديو الموعد والتفاصيل مباشرة. المساعد الصوتي قيد الإعداد.'
  });
  Object.assign(copy.tr, {
    preview:'Deneme sürümü', title:'Çekimini seç.<br><em>Talebini hazırla.</em>',
    voiceDescription:'Sesli asistan hazırlanıyor. Şimdilik formdan çekim talebini hazırlayıp gözden geçirebilirsin.',
    talkAction:'Sesli asistan hazırlanıyor', voiceOffline:'Sesli görüşme şu anda etkin değil. Aşağıdaki formdan talebini hazırlayabilirsin.',
    ownerTitle:'Bu sürüm hakkında', ownerNote:'Gmail’i açmadan önce çekim talebini hazırlayıp inceleyebilirsin. Mesajı sen gönderirsin; randevu ve ayrıntıları stüdyo doğrudan onaylar. Sesli asistan hazırlanıyor.'
  });
}
const $ = selector => document.querySelector(selector);
const form = $('#booking-form'), review = $('#review-dialog'), voiceDialog = $('#voice-dialog');
let language = 'ar', configured = false, currentMessage = '', lastVoiceState = '', transcriptText = '', consentMode = 'microphone';
const text = key => copy[language][key];
const show = dialog => { if (!dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); } };
const hide = dialog => { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
function setVoiceState(state) {
  lastVoiceState = state;
  const active = ['connecting', 'listening', 'speaking', 'muted'].includes(state);
  $('#call-controls').hidden = !active;
  $('#open-voice').disabled = active || !configured;
  $('#open-voice-test').disabled = active || !configured;
  document.documentElement.dataset.voiceState = state || (configured ? 'ready' : 'disabled');
  $('#orb-scene').classList.toggle('live', state === 'speaking' || state === 'listening');
  $('#voice-badge').classList.toggle('active', active);
  $('#voice-badge').textContent = text(active ? 'active' : configured ? 'ready' : 'unavailable');
  const displayState = consentMode === 'playback' ? ({ listening:'test-waiting', speaking:'test-speaking' }[state] || state) : state;
  $('#voice-status').textContent = text(displayState === 'unavailable' ? 'voiceError' : displayState) || text(configured ? 'voiceReady' : 'voiceOffline');
  $('#mute-voice').textContent = text(state === 'muted' ? 'unmute' : 'mute');
  if (!active) { transcriptText = ''; $('#transcript').textContent = ''; $('#transcript').hidden = true; }
}
const voice = new CustomerVoice({ onState: setVoiceState, onTranscript: value => { transcriptText = (transcriptText + value).slice(-1500); $('#transcript').textContent = transcriptText; $('#transcript').hidden = false; }, onOrder: service => { if (orderAssistant.enabled) orderAssistant.open(service); else openBooking(); } });
const orderAssistant = new OrderAssistant({ getLanguage: () => language, stopOtherVoice: () => voice.stop(false), onState: state => setVoiceState(state) });
orderAssistant.configure().then(enabled => {
  if (!enabled) return;
  Object.assign(copy.ar, { voiceDescription:'اطلب جلستك بالصوت. المساعد يسمع أجوبتك ويرسل الطلب تلقائيًا عبر القناة التي تختارها بصوتك.', bookingAction:'احجز طلب عبر المساعد ↙' });
  Object.assign(copy.tr, { voiceDescription:'Çekim talebini sesle hazırla. Asistan yanıtlarını dinler ve talebini sesle seçtiğin kanalla otomatik gönderir.', bookingAction:'Asistanla çekim talebi ↘' });
  $('[data-t="voiceDescription"]').textContent = text('voiceDescription');
  $('.voice-booking').textContent = text('bookingAction');
  if (embedded) window.parent.postMessage({type:'hamdi-ai:order-ready'}, embeddedParent);
});
window.addEventListener('message', event => {
  if (embedded && event.origin === embeddedParent && event.source === window.parent && event.data?.type === 'hamdi-ai:start-order'
    && Object.keys(event.data).length === 1 && orderAssistant.enabled) orderAssistant.open($('#service').value);
});

function updateConsent() {
  $('#confirm-voice').disabled = !configured || !$('#adult-check').checked || !$('#voice-check').checked;
  $('#voice-dialog-status').textContent = configured ? '' : text('voiceDisabled');
  $('[data-t="consentIntro"]').textContent = text(consentMode === 'playback' ? 'testConsentIntro' : 'consentIntro');
  $('[data-t="audioConsent"]').textContent = text(consentMode === 'playback' ? 'testAudioConsent' : 'audioConsent');
  $('#confirm-voice').textContent = text(consentMode === 'playback' ? 'testStart' : 'startVoice');
  $('#mute-voice').hidden = consentMode === 'playback';
}
function setLanguage(next) {
  if (!copy[next]) return;
  if (orderAssistant.dialog.open) orderAssistant.close();
  if (voice.active) voice.stop(false);
  language = next;
  document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.title = language === 'ar' ? 'حمدي AI | Hamdi Photography' : 'Hamdi AI | Hamdi Photography';
  document.querySelectorAll('[data-t]').forEach(el => { if (copy[language][el.dataset.t]) el.textContent = text(el.dataset.t); });
  document.querySelectorAll('[data-t-html]').forEach(el => { el.innerHTML = text(el.dataset.tHtml); });
  document.querySelectorAll('[data-placeholder]').forEach(el => { el.placeholder = text(el.dataset.placeholder); });
  document.querySelectorAll('[data-service-name]').forEach(el => { el.textContent = SERVICES[el.dataset.serviceName][language]; });
  document.querySelectorAll('[data-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.language === language)));
  document.querySelectorAll('.dialog-close').forEach(el => el.setAttribute('aria-label', text('close')));
  $('.language').setAttribute('aria-label', language === 'ar' ? 'اللغة' : 'Dil');
  $('#form-error').hidden = true; $('#review-status').textContent = '';
  setVoiceState(''); updateConsent();
  if (review.open) refreshReview();
}
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));

function selectService(value) {
  $('#service').value = value;
  document.querySelectorAll('[data-service]').forEach(button => button.classList.toggle('selected', button.dataset.service === value));
}
function openBooking(focusId = 'service') {
  if (voice.active) voice.stop();
  if (orderAssistant.enabled) { orderAssistant.open($('#service').value); return; }
  if (embedded) {
    window.parent.postMessage({ type:'hamdi-ai:booking', service:$('#service').value, language }, embeddedParent);
    return;
  }
  form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  $('#' + focusId).focus({ preventScroll: true });
}
document.querySelectorAll('a[href="#booking-form"]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openBooking(); }));
document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => { selectService(button.dataset.service); openBooking('name'); }));
$('#service').addEventListener('change', () => selectService($('#service').value));
$('#date').min = localDate();
$('#notes').addEventListener('input', () => { $('#notes-count').textContent = $('#notes').value.length; });
form.addEventListener('focusin', () => { if (voice.active) voice.stop(); });
form.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); $('#form-error').hidden = true; });

function refreshReview() {
  const result = validateBooking(Object.fromEntries(new FormData(form)));
  if (!result.valid) return null;
  currentMessage = bookingMessage(result.data, language);
  $('#message-preview').textContent = currentMessage;
  $('#message-preview').dir = language === 'ar' ? 'rtl' : 'ltr';
  $('#gmail-link').href = gmailUrl(currentMessage);
  return result;
}
form.addEventListener('submit', event => {
  event.preventDefault(); if (voice.active) voice.stop();
  const result = validateBooking(Object.fromEntries(new FormData(form)));
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  if (!result.valid) {
    const labels = { service: 'errorService', name: 'errorName', date: 'errorDate', phone: 'errorPhone', time: 'errorTime' };
    $('#form-error').textContent = [...new Set(result.errors)].map(key => text(labels[key])).join(' ');
    $('#form-error').hidden = false;
    result.errors.forEach(key => $(`#${key}`).setAttribute('aria-invalid', 'true'));
    $(`#${result.errors[0]}`).focus(); return;
  }
  refreshReview(); $('#review-status').textContent = ''; show(review);
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => hide(document.getElementById(button.dataset.close))));
for (const dialog of [review, voiceDialog]) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) hide(dialog); });
$('#gmail-link').addEventListener('click', () => { $('#review-status').textContent = text('openedDraft'); });
$('#copy-message').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentMessage); $('#review-status').textContent = text('copied'); }
  catch { $('#review-status').textContent = text('copyFailed'); }
});
function prepareVoice(mode) { consentMode = mode; $('#adult-check').checked = false; $('#voice-check').checked = false; updateConsent(); show(voiceDialog); }
$('#open-voice').addEventListener('click', () => prepareVoice('microphone'));
$('#open-voice-test').addEventListener('click', () => prepareVoice('playback'));
$('#adult-check').addEventListener('change', updateConsent); $('#voice-check').addEventListener('change', updateConsent);
$('#confirm-voice').addEventListener('click', async () => {
  if (!configured || !$('#adult-check').checked || !$('#voice-check').checked) return;
  hide(voiceDialog); await voice.start(language, { microphone: consentMode === 'microphone' });
});
$('#skip-to-form').addEventListener('click', () => { hide(voiceDialog); openBooking(); });
$('#mute-voice').addEventListener('click', () => voice.mute()); $('#end-voice').addEventListener('click', () => voice.stop());
window.addEventListener('pagehide', () => voice.stop(false));
document.addEventListener('visibilitychange', () => { if (document.hidden && voice.active) voice.stop(); });
setLanguage(pageOptions.get('lang') === 'tr' ? 'tr' : 'ar');
if (!staticDelivery && (location.protocol === 'http:' || location.protocol === 'https:')) {
  fetch('/api/status', { signal: AbortSignal.timeout(5000) }).then(response => response.ok ? response.json() : null).then(status => { configured = status?.configured === true; setVoiceState(''); updateConsent(); }).catch(() => { configured = false; setVoiceState(''); updateConsent(); });
}
