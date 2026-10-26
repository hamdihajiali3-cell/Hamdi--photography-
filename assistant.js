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
      pricePrompt:"ما أسعار باقات التصوير؟", bookingPrompt:"كيف أحجز جلسة تصوير؟", servicesPrompt:"ما أنواع التصوير التي تقدمونها؟",
      prices:"أسعار باقات التصوير في غازي عنتاب:\n• بورتريه وعائلة: 5 صور بـ 2,000 ليرة، أو 10 صور بـ 3,500 ليرة (جلسة حتى ساعة).\n• تخرج: 10 صور بـ 3,000 ليرة، أو 20 صورة بـ 5,000 ليرة.\n• منتجات وتجاري: 5 صور بـ 3,500 ليرة، أو 10 صور بـ 6,000 ليرة.\n• مناسبة وفعالية: 20 صورة حتى ساعتين بـ 5,000 ليرة، أو 40 صورة حتى 4 ساعات بـ 8,500 ليرة.\n• خطوبة وزفاف: 40 صورة حتى 4 ساعات بـ 8,500 ليرة، أو 80 صورة حتى 6 ساعات بـ 15,000 ليرة.\n• تعديل ألوان: صورة بـ 200 ليرة، 5 صور بـ 900 ليرة، أو 15 صورة بـ 2,400 ليرة.\nالألبوم المطبوع والفيديو والتنقيح المتقدم تُسعّر منفصلًا.",
      portrait:"جلسات البورتريه والعائلة تصل إلى ساعة. باقة 5 صور معدّلة بـ 2,000 ليرة، و10 صور بـ 3,500 ليرة. للحجز اختر التاريخ وعدد الصور في النموذج.",
      graduation:"باقات التخرج: 10 صور بـ 3,000 ليرة أو 20 صورة بـ 5,000 ليرة. أرسل التاريخ المفضّل من نموذج الحجز.",
      products:"تصوير المنتجات بخلفية بسيطة: 5 صور بـ 3,500 ليرة أو 10 صور بـ 6,000 ليرة. الزوايا الإضافية أو تنسيق المشهد تُسعّر منفصلًا.",
      events:"تغطية المناسبات: 20 صورة حتى ساعتين بـ 5,000 ليرة، أو 40 صورة حتى 4 ساعات بـ 8,500 ليرة.",
      wedding:"تغطية الخطوبة والزفاف: 40 صورة حتى 4 ساعات بـ 8,500 ليرة، أو 80 صورة حتى 6 ساعات بـ 15,000 ليرة. الألبوم المطبوع والفيديو بعرض منفصل.",
      color:"تعديل الإضاءة وتوازن الألوان: صورة واحدة بـ 200 ليرة، 5 صور بـ 900 ليرة، أو 15 صورة بـ 2,400 ليرة. التنقيح المتقدم يُسعّر منفصلًا.",
      services:"الخدمات: بورتريه وعائلة، تخرّج، تصوير منتجات وتجاري، مناسبات وفعاليات، خطوبة وزفاف، وتعديل ألوان الصور.",
      gallery:"شاهد نماذج أعمال حمدي في قسم المعرض بالموقع. إذا عندك أسلوب أو صورة مرجعية، أرسلها مع طلبك عبر نموذج الحجز.",
      contact:"للحجز أو السؤال الخاص، افتح نموذج الحجز واختر واتساب أو SMS لإرسال رسالة جاهزة إلى حمدي. رقم التواصل: 0537 742 36 71.",
      booking:"لإرسال طلب حجز، املأ نموذج الحجز واختر الجلسة وعدد الصور والتاريخ والفترة المناسبة. بعدها اختر واتساب أو SMS. الموعد لا يتأكد إلا بعد رد حمدي.",
      availability:"ما بقدر أشوف جدول المواعيد أو أؤكد التوفر. أرسل التاريخ والفترة المفضّلة من نموذج الحجز، وحمدي يؤكد لك عبر واتساب أو SMS.",
      location:"التصوير في غازي عنتاب، تركيا، بموعد مسبق. لتحديد التفاصيل أرسل طلبك من نموذج الحجز.",
      delivery:"عدد الصور ومدة التغطية يختلفان حسب الباقة. الألبوم المطبوع والفيديو والتنقيح المتقدم تُسعّر بشكل منفصل.",
      greeting:"أهلًا وسهلًا! اسألني عن الأسعار أو أنواع الجلسات أو الحجز.",
      fallback:"أقدر أساعدك بمعلومات الخدمات والأسعار والحجز. إذا كان سؤالك يحتاج تأكيدًا خاصًا، اكتب التفاصيل في نموذج الحجز واختر واتساب أو SMS لإرسالها إلى حمدي.",
      formLink:"نموذج الحجز", whatsapp:"واتساب"
    },
    tr: {
      launcher:"Hamdi'nin asistanı", eyebrow:"Yerel yanıtlar · harici AI yok", title:"Size nasıl yardımcı olabilirim?", close:"Kapat",
      welcome:"Merhaba! Hizmetler, fiyatlar, çekimler ve randevu hakkında sorabilirsiniz.", label:"Sorunuzu yazın", placeholder:"Sorunuzu buraya yazın...", send:"Gönder",
      pricesChip:"Fiyatlar", bookingChip:"Randevu", servicesChip:"Hizmetler",
      pricePrompt:"Fotoğraf paketlerinin fiyatları nedir?", bookingPrompt:"Nasıl fotoğraf çekimi randevusu alabilirim?", servicesPrompt:"Hangi çekim hizmetlerini sunuyorsunuz?",
      prices:"Gaziantep fotoğraf çekim paketleri:\n• Portre ve aile: 5 düzenlenmiş fotoğraf 2.000 TL; 10 fotoğraf 3.500 TL (1 saate kadar).\n• Mezuniyet: 10 fotoğraf 3.000 TL; 20 fotoğraf 5.000 TL.\n• Ürün ve ticari: 5 fotoğraf 3.500 TL; 10 fotoğraf 6.000 TL.\n• Etkinlik: 20 fotoğraf/2 saate kadar 5.000 TL; 40 fotoğraf/4 saate kadar 8.500 TL.\n• Nişan ve düğün: 40 fotoğraf/4 saate kadar 8.500 TL; 80 fotoğraf/6 saate kadar 15.000 TL.\n• Renk düzenleme: 1 fotoğraf 200 TL; 5 fotoğraf 900 TL; 15 fotoğraf 2.400 TL.\nBasılı albüm, video ve ileri rötuş ayrıca fiyatlandırılır.",
      portrait:"Portre ve aile çekimi 1 saate kadar sürer. 5 düzenlenmiş fotoğraf 2.000 TL, 10 fotoğraf 3.500 TL. Randevu için formdan tarih ve fotoğraf sayısını seçin.",
      graduation:"Mezuniyet paketleri: 10 fotoğraf 3.000 TL veya 20 fotoğraf 5.000 TL. Tercih ettiğiniz tarihi formdan gönderin.",
      products:"Basit fonlu ürün çekimi: 5 fotoğraf 3.500 TL veya 10 fotoğraf 6.000 TL. Ek açılar veya konsept ayrıca fiyatlandırılır.",
      events:"Etkinlik çekimi: 20 fotoğraf/2 saate kadar 5.000 TL; 40 fotoğraf/4 saate kadar 8.500 TL.",
      wedding:"Nişan ve düğün çekimi: 40 fotoğraf/4 saate kadar 8.500 TL veya 80 fotoğraf/6 saate kadar 15.000 TL. Basılı albüm ve video ayrıca fiyatlandırılır.",
      color:"Işık ve renk düzenleme: 1 fotoğraf 200 TL, 5 fotoğraf 900 TL veya 15 fotoğraf 2.400 TL. İleri rötuş ayrıca fiyatlandırılır.",
      services:"Hizmetler: portre ve aile, mezuniyet, ürün ve ticari çekim, etkinlik, nişan ve düğün, fotoğraflar için renk düzenleme.",
      gallery:"Hamdi'nin örnek çalışmalarını sitedeki galeri bölümünde görebilirsiniz. Beğendiğiniz bir tarz veya referans fotoğraf varsa randevu formuna ekleyin.",
      contact:"Randevu veya özel sorular için formu açıp Hamdi'ye hazır mesajı WhatsApp ya da SMS ile gönderin. Telefon: 0537 742 36 71.",
      booking:"Randevu isteği göndermek için formdan çekim türünü, fotoğraf sayısını, tarih ve uygun saat aralığını seçin. Ardından WhatsApp veya SMS ile gönderin. Randevu Hamdi onayladıktan sonra kesinleşir.",
      availability:"Randevu takvimini göremiyorum ve uygunluğu onaylayamam. Tercih ettiğiniz tarihi formdan gönderin; Hamdi WhatsApp veya SMS ile dönüş yapar.",
      location:"Çekimler Gaziantep, Türkiye'de, randevu ile yapılır. Ayrıntılar için formdan talep gönderin.",
      delivery:"Fotoğraf sayısı ve çekim süresi pakete göre değişir. Basılı albüm, video ve ileri rötuş ayrıca fiyatlandırılır.",
      greeting:"Merhaba! Fiyatlar, çekim türleri veya randevu hakkında sorabilirsiniz.",
      fallback:"Hizmetler, fiyatlar ve randevu konusunda yardımcı olabilirim. Özel bir onay gerekiyorsa formu doldurup WhatsApp veya SMS ile Hamdi'ye gönderin.",
      formLink:"Randevu formu", whatsapp:"WhatsApp"
    },
    en: {
      launcher:"Hamdi's assistant", eyebrow:"Local answers · no external AI", title:"How can I help?", close:"Close",
      welcome:"Hello! Ask about services, prices, sessions, and booking.", label:"Write your question", placeholder:"Type your question here...", send:"Send",
      pricesChip:"Prices", bookingChip:"Booking", servicesChip:"Services",
      pricePrompt:"What are the photography package prices?", bookingPrompt:"How do I book a photo session?", servicesPrompt:"What photography services do you offer?",
      prices:"Photography packages in Gaziantep:\n• Portrait/family: 5 edited photos for TRY 2,000, or 10 for TRY 3,500 (up to 1 hour).\n• Graduation: 10 photos for TRY 3,000, or 20 for TRY 5,000.\n• Product/commercial: 5 photos for TRY 3,500, or 10 for TRY 6,000.\n• Events: 20 photos/up to 2 hours for TRY 5,000, or 40/up to 4 hours for TRY 8,500.\n• Engagement/wedding: 40 photos/up to 4 hours for TRY 8,500, or 80/up to 6 hours for TRY 15,000.\n• Color correction: 1 photo for TRY 200, 5 for TRY 900, or 15 for TRY 2,400.\nPrinted albums, video, and advanced retouching are quoted separately.",
      portrait:"Portrait and family sessions are up to one hour: 5 edited photos for TRY 2,000 or 10 for TRY 3,500. Choose your date and photo count in the booking form.",
      graduation:"Graduation packages: 10 photos for TRY 3,000 or 20 for TRY 5,000. Send your preferred date through the booking form.",
      products:"Simple-background product photography: 5 photos for TRY 3,500 or 10 for TRY 6,000. Extra angles or setup are quoted separately.",
      events:"Event coverage: 20 photos/up to 2 hours for TRY 5,000, or 40 photos/up to 4 hours for TRY 8,500.",
      wedding:"Engagement and wedding coverage: 40 photos/up to 4 hours for TRY 8,500 or 80 photos/up to 6 hours for TRY 15,000. Printed albums and video are quoted separately.",
      color:"Color correction: 1 photo for TRY 200, 5 photos for TRY 900, or 15 for TRY 2,400. Advanced retouching is quoted separately.",
      services:"Services include portrait/family, graduation, product/commercial, events, engagement/wedding, and photo color correction.",
      gallery:"Browse Hamdi's work in the gallery section of the site. If you have a preferred style or reference photo, add it to your booking request.",
      contact:"For a booking or a personal question, open the booking form and send Hamdi the prepared message by WhatsApp or SMS. Phone: 0537 742 36 71.",
      booking:"To send a booking request, choose the session, photo package, preferred date, and time range in the form. Then choose WhatsApp or SMS. The date is confirmed only after Hamdi replies.",
      availability:"I can't see the booking calendar or confirm availability. Send your preferred date and time range in the form; Hamdi will reply by WhatsApp or SMS.",
      location:"Sessions are by appointment in Gaziantep, Türkiye. Use the booking form to send your preferred details.",
      delivery:"Photo counts and session duration depend on the package. Printed albums, video, and advanced retouching are quoted separately.",
      greeting:"Hello! Ask about prices, session types, or booking.",
      fallback:"I can help with services, prices, and booking. For a detail that needs personal confirmation, fill the form and send it to Hamdi by WhatsApp or SMS.",
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
    if (has(value, ["معرض","نماذج","gallery","portfolio","portfolyo"])) return words.gallery;
    if (has(value, ["whatsapp","واتساب","sms","رقم","تواصل","اتصل","iletisim","telefon","contact","call","phone"])) return words.contact;
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
    const key = prompt.dataset.assistantPrompt + "Prompt";
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
