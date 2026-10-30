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
      welcome:"أهلًا! اسألني عن الخدمات وأنواع التصوير والحجز.", label:"اكتب سؤالك", placeholder:"اكتب سؤالك هنا...", send:"إرسال",
      bookingChip:"الحجز", servicesChip:"الخدمات",
      bookingPrompt:"كيف أحجز جلسة تصوير؟", servicesPrompt:"ما أنواع التصوير التي تقدمونها؟",
      quote:"للاستفسار عن السعر الحالي، اختر نوع الجلسة وأرسل طلبك إلى حمدي من نموذج الحجز. سيؤكد لك التفاصيل عبر وسيلة التواصل التي تختارها.",
      portrait:"جلسات بورتريه وعائلة تُرتّب حسب الفكرة والتفاصيل. أرسل طلبك من نموذج الحجز لتحديد ما يناسبك.",
      graduation:"تصوير التخرج متاح بجلسات تناسب المناسبة. أرسل التاريخ والتفاصيل من نموذج الحجز.",
      products:"تصوير المنتجات والتصوير التجاري متاحان، ويمكن تحديد الخلفية والتنسيق المطلوبين في طلب الحجز.",
      events:"تغطية المناسبات والفعاليات تُحدّد وفق وقت المناسبة وتفاصيلها. أرسل طلبك ليؤكد حمدي ما يناسبك.",
      wedding:"تغطية الخطوبة والزفاف متاحة، ويمكن إرسال تفاصيل المناسبة وموعدها عبر نموذج الحجز.",
      color:"تعديل ألوان الصور متاح، ويعتمد نطاق العمل على الصور والتعديلات المطلوبة.",
      services:"الخدمات: بورتريه وعائلة، تخرّج، تصوير منتجات وتجاري، مناسبات وفعاليات، خطوبة وزفاف، وتعديل ألوان الصور.",
      gallery:"شاهد نماذج أعمال حمدي في قسم المعرض بالموقع. إذا عندك أسلوب أو صورة مرجعية، أرسلها مع طلبك عبر نموذج الحجز.",
      contact:"للحجز أو السؤال الخاص، اختر طريقة الإرسال من النموذج: واتساب أو SMS أو البريد إلى hamdihajiali76@gmail.com. عند اختيار البريد أدخل عنوانك ليظهر في الرسالة.",
      booking:"لإرسال طلب حجز، اختر الجلسة والتاريخ والفترة المناسبة من النموذج، ثم اختر طريقة الإرسال. الموعد يتأكد بعد رد حمدي.",
      availability:"ما بقدر أشوف جدول المواعيد أو أؤكد التوفر. أرسل التاريخ والفترة المفضّلة من نموذج الحجز، وحمدي يؤكد لك عبر واتساب أو SMS.",
      location:"التصوير في غازي عنتاب، تركيا، بموعد مسبق. لتحديد التفاصيل أرسل طلبك من نموذج الحجز.",
      delivery:"تتحدد مدة التغطية والخدمات الإضافية بحسب تفاصيل الطلب. الألبوم المطبوع والفيديو والتنقيح المتقدم تُسعّر منفصلًا.",
      greeting:"أهلًا وسهلًا! اسألني عن أنواع الجلسات أو الخدمات أو الحجز.",
      fallback:"أقدر أساعدك بمعلومات الخدمات والحجز. إذا كان سؤالك يحتاج تأكيدًا خاصًا، اكتب التفاصيل في نموذج الحجز واختر واتساب أو SMS أو البريد الإلكتروني لإرسالها إلى حمدي.",
      formLink:"نموذج الحجز", whatsapp:"واتساب"
    },
    tr: {
      launcher:"Hamdi'nin asistanı", eyebrow:"Yerel yanıtlar · harici AI yok", title:"Size nasıl yardımcı olabilirim?", close:"Kapat",
      welcome:"Merhaba! Hizmetler, çekim türleri ve randevu hakkında sorabilirsiniz.", label:"Sorunuzu yazın", placeholder:"Sorunuzu buraya yazın...", send:"Gönder",
      bookingChip:"Randevu", servicesChip:"Hizmetler",
      bookingPrompt:"Nasıl fotoğraf çekimi randevusu alabilirim?", servicesPrompt:"Hangi çekim hizmetlerini sunuyorsunuz?",
      quote:"Güncel fiyat bilgisi için çekim türünü seçip rezervasyon formundan Hamdi’ye talep gönderin. Ayrıntıları seçtiğiniz iletişim yöntemiyle doğrulayacaktır.",
      portrait:"Portre ve aile çekimleri isteğe göre planlanır. Size uygun çekim için rezervasyon formundan talep gönderin.",
      graduation:"Mezuniyet çekimleri için tercih ettiğiniz tarihi ve ayrıntıları rezervasyon formundan gönderin.",
      products:"Ürün ve ticari çekimlerde arka planı ve istediğiniz düzeni rezervasyon formunda belirtebilirsiniz.",
      events:"Etkinlik çekimi, etkinliğin süresi ve ayrıntılarına göre planlanır. Talebinizi gönderin; Hamdi size dönüş yapsın.",
      wedding:"Nişan ve düğün çekimi için etkinlik ayrıntılarını ve tarihi rezervasyon formundan gönderebilirsiniz.",
      color:"Fotoğraflarda ışık ve renk düzenleme hizmeti sunulur; çalışma kapsamı istenen düzenlemelere göre belirlenir.",
      services:"Hizmetler: portre ve aile, mezuniyet, ürün ve ticari çekim, etkinlik, nişan ve düğün, fotoğraflar için renk düzenleme.",
      gallery:"Hamdi'nin örnek çalışmalarını sitedeki galeri bölümünde görebilirsiniz. Beğendiğiniz bir tarz veya referans fotoğraf varsa randevu formuna ekleyin.",
      contact:"Randevu veya özel sorular için formdan WhatsApp, SMS ya da hamdihajiali76@gmail.com adresine e-posta seçin. E-posta seçerseniz kendi adresinizi girin.",
      booking:"Randevu isteği için formdan çekim türünü, tarihi ve uygun saat aralığını seçin; ardından gönderim yöntemini belirleyin. Randevu Hamdi'nin yanıtıyla kesinleşir.",
      availability:"Randevu takvimini göremiyorum ve uygunluğu onaylayamam. Tercih ettiğiniz tarihi formdan gönderin; Hamdi WhatsApp, SMS veya e-posta ile dönüş yapar.",
      location:"Çekimler Gaziantep, Türkiye'de, randevu ile yapılır. Ayrıntılar için formdan talep gönderin.",
      delivery:"Çekim süresi ve ek hizmetler talep ayrıntılarına göre belirlenir. Basılı albüm, video ve ileri rötuş ayrıca fiyatlandırılır.",
      greeting:"Merhaba! Çekim türleri, hizmetler veya randevu hakkında sorabilirsiniz.",
      fallback:"Hizmetler ve randevu konusunda yardımcı olabilirim. Özel bir onay gerekiyorsa formu doldurup WhatsApp, SMS veya e-posta ile Hamdi'ye gönderin.",
      formLink:"Randevu formu", whatsapp:"WhatsApp"
    },
    en: {
      launcher:"Hamdi's assistant", eyebrow:"Local answers · no external AI", title:"How can I help?", close:"Close",
      welcome:"Hello! Ask about photography services, session types, and booking.", label:"Write your question", placeholder:"Type your question here...", send:"Send",
      bookingChip:"Booking", servicesChip:"Services",
      bookingPrompt:"How do I book a photo session?", servicesPrompt:"What photography services do you offer?",
      quote:"For current pricing, choose the session type and send Hamdi a request through the booking form. He can confirm the details through your selected contact method.",
      portrait:"Portrait and family sessions are planned around your needs. Send a request through the booking form to discuss a suitable session.",
      graduation:"For a graduation session, send your preferred date and details through the booking form.",
      products:"Product and commercial photography are available. Describe the background and setup you need in the booking form.",
      events:"Event coverage is planned around the event duration and details. Send a request so Hamdi can confirm what fits.",
      wedding:"Engagement and wedding coverage is available. Send the event details and preferred date through the booking form.",
      color:"Photo color correction is available; the scope depends on the images and edits requested.",
      services:"Services include portrait/family, graduation, product/commercial, events, engagement/wedding, and photo color correction.",
      gallery:"Browse Hamdi's work in the gallery section of the site. If you have a preferred style or reference photo, add it to your booking request.",
      contact:"For a booking or personal question, choose WhatsApp, SMS, or email to hamdihajiali76@gmail.com in the form. If you choose email, enter your address so it is included in the message.",
      booking:"To request a booking, choose the session, preferred date, and time range in the form, then select how to send it. The date is confirmed after Hamdi replies.",
      availability:"I can't see the booking calendar or confirm availability. Send your preferred date and time range in the form; Hamdi will reply by WhatsApp, SMS, or email.",
      location:"Sessions are by appointment in Gaziantep, Türkiye. Use the booking form to send your preferred details.",
      delivery:"Coverage duration and extra services depend on the request details. Printed albums, video, and advanced retouching are quoted separately.",
      greeting:"Hello! Ask about session types, services, or booking.",
      fallback:"I can help with services and booking. For a detail that needs personal confirmation, fill the form and send it to Hamdi by WhatsApp, SMS, or email.",
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
      node.textContent = words[type === "services" ? "servicesChip" : "bookingChip"];
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
    if (has(value, ["السعر","اسعار","تكلف","ليرة","باقه","باقات","price","cost","how much","fiyat","ucret","tl"])) return words.quote;
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
    const key = (promptType === "services" ? "services" : "booking") + "Prompt";
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

  // Load the official Bland web-chat embed after the local assistant initializes.
  const blandScript = document.createElement("script");
  blandScript.src = "bland-widget.js?v=20261030-live";
  blandScript.async = true;
  document.head.appendChild(blandScript);

  widget.hidden = false;
})();
