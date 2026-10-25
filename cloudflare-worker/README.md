# تفعيل مساعد Hamdi Photography بأمان

الموقع يبقى على GitHub Pages، بينما يتصل المساعد بخادم Cloudflare Worker. **لا تضع مفتاح OpenAI في GitHub أو ملفات الموقع ولا ترسله في المحادثة.**

## النشر من لوحة Cloudflare

1. افتح [Cloudflare Dashboard](https://dash.cloudflare.com/) وسجّل الدخول أو أنشئ حسابًا.
2. افتح **Workers & Pages** ثم **Create application** واختر **GitHub**.
3. اربط حساب GitHub واختر المستودع `hamdihajiali3-cell/Hamdi--photography-`.
4. اضبط فرع النشر على `main`، ومجلد المشروع على `cloudflare-worker`. اترك أمر البناء فارغًا، واستخدم أمر النشر `npx wrangler deploy`. ثم اختر **Save and Deploy**.
5. بعد ظهور الـWorker، افتحه ثم **Settings → Variables and Secrets → Add → Secret**. اسم السر `OPENAI_API_KEY`، والقيمة هي مفتاح OpenAI الجديد. احفظه وانشر التغيير. هذه القيمة لا تظهر لزوار الموقع.
6. انسخ عنوان Worker الذي ينتهي بـ `.workers.dev` وأرسله إلى مساعد Codex فقط. أرسل العنوان العام، **ولا ترسل مفتاح OpenAI**. سأضع العنوان في `ai-config.js` ليتصل زر المساعد بالموقع.

إذا لم يظهر خيار GitHub أو واجهت شاشة مختلفة، أرسل صورة للشاشة بعد إخفاء أي مفاتيح أو بيانات سرية.

## ملاحظات

- احذف أي مفتاح سبق إرساله في محادثة أو إضافته إلى مستودع، ثم راجع صفحة الاستخدام.
- واجهة المساعد مخفية حتى إضافة عنوان Worker؛ لذلك لن يظهر زر معطّل قبل اكتمال الربط.
- يستخدم الخادم GPT-6 Luna، ويقبل الطلبات من موقع GitHub Pages فقط، ويحد طول الرسائل والسجل، ويضبط حدًا تقريبيًا قدره 10 طلبات في الدقيقة لكل عنوان IP.
- عنوان الموقع المسموح مضبوط في `wrangler.toml` على `https://hamdihajiali3-cell.github.io`.
- لا تضع أي سر داخل `ai-config.js`؛ هذا الملف يحتوي عنوان Worker العام فقط.
