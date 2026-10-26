(() => {
  const widget = document.getElementById("assistantWidget");
  if (!widget) return;
  const launcher = document.getElementById("assistantLauncher");
  const panel = document.getElementById("assistantPanel");
  const closeButton = document.getElementById("assistantClose");
  const form = document.getElementById("assistantForm");
  const input = document.getElementById("assistantInput");
  const messagesNode = document.getElementById("assistantMessages");
  const welcome = widget.querySelector("[data-assistant-welcome]");
  if (!launcher || !panel || !closeButton || !form || !input || !messagesNode) return;

  const copy = {
    ar: {
      launcher:"مساعد حمدي", eyebrow:"إجابات محلية · بلا اتصال خارجي", title:"كيف أقدر أساعدك؟", close:"إغلاق",
      welcome:"أهلًا! اسألني عن الخدمات والأسعار والتصوير والحجز.", label:"اكتب سؤالك", placeholder:"اكتب سؤالك هنا...", send:"إرسال",
      pricesChip:"الأسعار", bookingChip:"الحجز", servicesChip:"الخدمات",
      pricePrompt:"ما أسعار جلسات التصوير؟",
      prices:"أسعار التصوير في غازي عنتاب تبدأ من:\n• بورتريه وعائلة، حتى ساعة: 2,000 ليرة.\n• تخرّج: 3,000 ليرة.\n• منتجات وتجاري: 3,500 ليرة.\n• مناسبات وفعاليات: 5,000 ليرة.\n• خطوبة وزفاف: 8,500 ليرة.\n• تعديل ألوان: 200 ليرة.\nالسعر النهائي بحسب تفاصيل الطلب. الألبوم المطبوع والفيديو والتنقيح المتقدم تُسعّر منفصلًا.",
      portrait:"جلسات البورتريه والعائلة حتى ساعة تبدأ من 2,000 ليرة. أرسل التاريخ والتفاصيل من نموذج الحجز.",
      graduation:"جلسات التخرج تبدأ من 3,000 ليرة. السعر النهائي بحسب تفاصيل الجلسة والتاريخ المفضّل.",
      products:"تصوير المنتجات بخلفية بسيطة يبدأ من 3,500 ليرة. الزوايا أو التنسيق الإضافي تُسعّر منفصلًا.",
      events:"تغطية المناسبات والفعاليات تبدأ من 5,000 ليرة؛ ويعتمد السعر النهائي على مدة التغطية والتفاصيل.",
      wedding:"تغطية الخطوبة والزفاف تبدأ من 8,500 ليرة. الألبوم المطبوع والفيديو بعرض منفصل.",
      color:"خدمة تعديل الألوان تبدأ من 200 ليرة. التنقيح المتقدم يُسعّر منفصلًا.",
      services:"الخدمات: بورتريه وعائلة، تخرّج، تصوير منتجات وتجاري، مناسبات وفعاليات، خطوبة وزفاف، وتعديل ألوان الصور.",
      gallery:"شاهد نماذج أعمال حمدي في قسم المعرض بالموقع. إذا عندك أسلوب أو صورة مرجعية، أرسلها مع طلبك عبر نموذج الحجز.",
      contact:"للحجز أو السؤال الخاص، اختر طريقة الإرسال من النموذج: واتساب أو SMS أو البريد إلى hamdihajiali76@gmail.com. عند اختيار البريد أدخل عنوانك ليظهر في الرسالة.",
      booking:"لإرسال طلب حجز، اختر الجلسة والتاريخ والفترة المناسبة من النموذج، ثم اختر طريقة الإرسال. الموعد يتأكد بعد رد حمدي.",
      availability:"ما بقدر أشوف جدول المواعيد أو أؤكد التوفر. أرسل التاريخ والفترة المفضّلة من نموذج الحجز، وحمدي يؤكد لك عبر واتساب أو SMS.",
      location:"التصوير في غازي عنتاب، تركيا، بموعد مسبق. لتحديد التفاصيل أرسل طلبك من نموذج الحجز.",
      delivery:"تتحدد مدة التغطية والخدمات الإضافية بحسب تفاصيل الطلب. الألبوم المطبوع والفيديو والتنقيح المتقدم تُسعّر منفصلًا.",
      greeting:"أهلًا وسهلًا! اسألني عن الأسعار أو أنواع الجلسات أو الحجز.",
      fallback:"أقدر أساعدك بمعلومات الخدمات والأسعار والحجز. إذا كان سؤالك يحتاج تأكيدًا خاصًا، اكتب التفاصيل في نموذج الحجز واختر واتساب أو SMS أو البريد الإلكتروني لإرسالها إلى حمدي.",
      formLink:"نموذج الحجز", whatsapp:"واتساب"
    },
    tr: {
      launcher:"Hamdi'nin asistanı", eyebrow:"Yerel yanıtlar · harici AI yok", title:"Size nasıl yardımcı olabilirim?", close:"Kapat",
      welcome:"Merhaba! Hizmetler, fiyatlar, çekimler ve randevu hakkında sorabilirsiniz.", label:"Sorunuzu yazın", placeholder:"Sorunuzu buraya yazın...", send:"Gönder",
      pricesChip:"Fiyatlar", bookingChip:"Randevu", servicesChip:"Hizmetler",
      pricePrompt:"Çekim fiyatları nedir?",
      prices:"Gaziantep'te çekim fiyatları şu tutarlardan başlar:\n• Portre ve aile, bir saate kadar: 2.000 TL.\n• Mezuniyet: 3.000 TL.\n• Ürün ve ticari çekim: 3.500 TL.\n• Etkinlik: 5.000 TL.\n• Nişan ve düğün: 8.500 TL.\n• Renk düzenleme: 200 TL.\nKesin ücret talep ayrıntılarına göre belirlenir. Basılı albüm, video ve ileri rötuş ayrıca fiyatlandırılır.",
      portrait:"Portre ve aile çekimleri bir saate kadar 2.000 TL'den başlar. Tarih ve ayrıntıları randevu formundan gönderin.",
      graduation:"Mezuniyet çekimleri 3.000 TL'den başlar. Kesin ücret çekim ayrıntılarına ve tarihe göre belirlenir.",
      products:"Basit fonlu ürün çekimi 3.500 TL'den başlar. Ek açılar veya konsept ayrıca fiyatlandırılır.",
      events:"Etkinlik çekimleri 5.000 TL'den başlar; kesin ücret çekim süresine ve ayrıntılara göre belirlenir.",
      wedding:"Nişan ve düğün çekimleri 8.500 TL'den başlar. Basılı albüm ve video ayrıca fiyatlandırılır.",
      color:"Renk düzenleme hizmeti 200 TL'den başlar. İleri rötuş ayrıca fiyatlandırılır.",
      services:"Hizmetler: portre ve aile, mezuniyet, ürün ve ticari çekim, etkinlik, nişan ve düğün, fotoğraflar için renk düzenleme.",
      gallery:"Hamdi'nin örnek çalışmalarını sitedeki galeri bölümünde görebilirsiniz. Beğendiğiniz bir tarz veya referans fotoğraf varsa randevu formuna ekleyin.",
      contact:"Randevu veya özel sorular için formdan WhatsApp, SMS ya da hamdihajiali76@gmail.com adresine e-posta seçin. E-posta seçerseniz kendi adresinizi girin.",
      booking:"Randevu isteği için formdan çekim türünü, tarihi ve uygun saat aralığını seçin; ardından gönderim yöntemini belirleyin. Randevu Hamdi'nin yanıtıyla kesinleşir.",
      availability:"Randevu takvimini göremiyorum ve uygunluğu onaylayamam. Tercih ettiğiniz tarihi formdan gönderin; Hamdi WhatsApp, SMS veya e-posta ile dönüş yapar.",
      location:"Çekimler Gaziantep, Türkiye'de, randevu ile yapılır. Ayrıntılar için formdan talep gönderin.",
      delivery:"Çekim süresi ve ek hizmetler talep ayrıntılarına göre belirlenir. Basılı albüm, video ve ileri rötuş ayrıca fiyatlandırılır.",
      greeting:"Merhaba! Fiyatlar, çekim türleri veya randevu hakkında sorabilirsiniz.",
      fallback:"Hizmetler, fiyatlar ve randevu konusunda yardımcı olabilirim. Özel bir onay gerekiyorsa formu doldurup WhatsApp, SMS veya e-posta ile Hamdi'ye gönderin.",
      formLink:"Randevu formu", whatsapp:"WhatsApp"
    },
    en: {
      launcher:"Hamdi's assistant", eyebrow:"Local answers · no external AI", title:"How can I help?", close:"Close",
      welcome:"Hello! Ask about services, prices, sessions, and booking.", label:"Write your question", placeholder:"Type your question here...", send:"Send",
      pricesChip:"Prices", bookingChip:"Booking", servicesChip:"Services",
      pricePrompt:"What are the photography session prices?",
      prices:"Photography prices in Gaziantep start at:\n• Portrait and family, up to one hour: TRY 2,000.\n• Graduation: TRY 3,000.\n• Product and commercial: TRY 3,500.\n• Events: TRY 5,000.\n• Engagement and wedding: TRY 8,500.\n• Color correction: TRY 200.\nFinal pricing depends on the request details. Printed albums, video, and advanced retouching are quoted separately.",
      portrait:"Portrait and family sessions of up to one hour start at TRY 2,000. Send the date and details through the booking form.",
      graduation:"Graduation sessions start at TRY 3,000. Final pricing depends on the session details and preferred date.",
      products:"Simple-background product photography starts at TRY 3,500. Extra angles or styling are quoted separately.",
      events:"Event coverage starts at TRY 5,000. Final pricing depends on coverage duration and request details.",
      wedding:"Engagement and wedding coverage starts at TRY 8,500. Printed albums and video are quoted separately.",
      color:"Color correction starts at TRY 200. Advanced retouching is quoted separately.",
      services:"Services include portrait/family, graduation, product/commercial, events, engagement/wedding, and photo color correction.",
      gallery:"Browse Hamdi's work in the gallery section of the site. If you have a preferred style or reference photo, add it to your booking request.",
      contact:"For a booking or personal question, choose WhatsApp, SMS, or email to hamdihajiali76@gmail.com in the form. If you choose email, enter your address so it is included in the message.",
      booking:"To request a booking, choose the session, preferred date, and time range in the form, then select how to send it. The date is confirmed after Hamdi replies.",
      availability:"I can't see the booking calendar or confirm availability. Send your preferred date and time range in the form; Hamdi will reply by WhatsApp, SMS, or email.",
      location:"Sessions are by appointment in Gaziantep, Türkiye. Use the booking form to send your preferred details.",
      delivery:"Coverage duration and extra services depend on the request details. Printed albums, video, and advanced retouching are quoted separately.",
      greeting:"Hello! Ask about prices, session types, or booking.",
      fallback:"I can help with services, prices, and booking. For a detail that needs personal confirmation, fill the form and send it to Hamdi by WhatsApp, SMS, or email.",
      formLink:"Booking form", whatsapp:"WhatsApp"
    }
  };

  function currentLanguage() {
    const lang = (document.documentElement.lang || "ar").toLowerCase();
    return lang.startsWith("tr") ? "tr" : lang.startsWith("en") ? "en" : "ar";
  }
  function setLanguage() {
    const lang = currentLanguage();
    const words = copy[lang];
    widget.dir = lang === "ar" ? "rtl" : "ltr";
    widget.querySelectorAll("[data-ai-copy]").forEach((node) => {
      const value = words[node.dataset.aiCopy];
      if (value) node.textContent = value;
    });
    widget.querySelectorAll("[data-ai-placeholder]").forEach((node) => {
      const value = words[node.dataset.aiPlaceholder];
      if (value) node.setAttribute("placeholder", value);
    });
    widget.querySelectorAll("[data-ai-aria]").forEach((node) => {
      const value = words[node.dataset.aiAria];
      if (value) node.setAttribute("aria-label", value);
    });
    widget.querySelectorAll("[data-assistant-prompt]").forEach((node) => {
      const type = node.dataset.assistantPrompt;
      node.textContent = words[type === "prices" ? "pricesChip" : type === "services" ? "servicesChip" : "bookingChip"];
    });
    if (welcome && messagesNode.children.length === 1) welcome.textContent = words.welcome;
    input.setAttribute("aria-label", words.label);
  }
  function addMessage(message, role) {
    const bubble = document.createElement("p");
    bubble.className = "assistant-message assistant-message--" + role;
    bubble.dir = "auto";
    bubble.textContent = message;
    messagesNode.appendChild(bubble);
    messagesNode.scrollTop = messagesNode.scrollHeight;
  }
  function normalize(value) {
    return String(value || "").toLocaleLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
  }
  function has(value, terms) {
    return terms.some((term) => value.includes(term));
  }
  function replyFor(question) {
    const value = normalize(question);
    const words = copy[currentLanguage()];
    if (/^(مرحبا|اهلا|السلام عليكم|merhaba|selam|hello|hi|hey)[!؟?. ]*$/.test(value)) return words.greeting;
    if (has(value, ["متاح","فاضي","توفر","توافر","availability","available","free date","musait","uygun mu","uygunluk"])) return words.availability;
    if (has(value, ["حجز","احجز","randevu","rezervasyon","book","booking","appointment"])) return words.booking;
    if (has(value, ["السعر","اسعار","تكلف","ليرة","باقه","باقات","price","cost","how much","fiyat","ucret","tl"])) {
      if (has(value, ["بورتريه","عائله","portrait","family","portre","aile"])) return words.portrait;
      if (has(value, ["تخرج","graduation","mezun"])) return words.graduation;
      if (has(value, ["منتج","تجاري","product","commercial","urun","ticari"])) return words.products;
      if (has(value, ["مناسبه","فعاليه","event","etkinlik"])) return words.events;
      if (has(value, ["زفاف","عرس","خطوبه","wedding","dugun","nisan","engagement"])) return words.wedding;
      if (has(value, ["الوان","لون","color","colour","renk"])) return words.color;
      return words.prices;
    }
    if (has(value, ["بورتريه","عائله","portrait","family","portre","aile"])) return words.portrait;
    if (has(value, ["تخرج","graduation","mezun"])) return words.graduation;
    if (has(value, ["منتج","تجاري","product","commercial","urun","ticari"])) return words.products;
    if (has(value, ["مناسبه","فعاليه","event","etkinlik"])) return words.events;
    if (has(value, ["زفاف","عرس","خطوبه","wedding","dugun","nisan","engagement"])) return words.wedding;
    if (has(value, ["لون","الوان","color","colour","renk"])) return words.color;
    if (has(value, ["معرض","نماذج","gallery","portfolio","portfolyo"])) return words.gallery;
    if (has(value, ["whatsapp","واتساب","sms","email","e-mail","mail","بريد","ايميل","إيميل","e-posta","رقم","تواصل","اتصل","iletisim","telefon","contact","call","phone"])) return words.contact;
    if (has(value, ["غازي عنتاب","gaziantep","location","where","nerede","مكانكم"])) return words.location;
    if (has(value, ["لون","الوان","color","colour","renk"])) return words.color;
    if (has(value, ["خدمه","خدمات","تصوير","جلسه","جلسات","services","hizmet","shoot","photo session"])) return words.services;
    if (has(value, ["صوره","صور","photo","photos","video","فيديو","البوم","album","teslim","delivery"])) return words.delivery;
    return words.fallback;
  }
  function ask(question) {
    const message = String(question || "").trim();
    if (!message) return;
    addMessage(message, "user");
    input.value = "";
    addMessage(replyFor(message), "bot");
    input.focus();
  }
  launcher.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    launcher.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) window.setTimeout(() => input.focus(), 30);
    else launcher.focus();
  });
  closeButton.addEventListener("click", () => {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  });
  widget.addEventListener("click", (event) => {
    const prompt = event.target.closest("[data-assistant-prompt]");
    if (!prompt) return;
    const promptType = prompt.dataset.assistantPrompt;
    const key = (promptType === "prices" ? "price" : promptType) + "Prompt";
    ask(copy[currentLanguage()][key]);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }
  });
  const observer = new MutationObserver(setLanguage);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  setLanguage();
  widget.hidden = false;
})();
