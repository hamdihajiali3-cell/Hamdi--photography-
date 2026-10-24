# تفعيل مساعد Hamdi الذكي أونلاين

أضفت واجهة المساعد وكود خادم Cloudflare Worker الذي يرسل الرسائل إلى OpenAI Responses API. واجهة GitHub Pages لا تتصل بالنموذج وحدها، لذلك لن يجيب المساعد حتى تنشر الخادم وتضيف مفتاح API كـ Secret. لا تضع المفتاح في ملفات الموقع أو ترسله في المحادثة.

## تفعيل المساعد من لوحة Cloudflare

1. أنشئ حسابًا في [Cloudflare](https://dash.cloudflare.com/) وافتح **Workers & Pages**.
2. اختر **Create application → Create Worker**، وسمّه `hamdi-photography-ai`، ثم انشر قالب البداية.
3. من صفحة العامل اختر **Edit code**، واستبدل الكود الموجود بمحتوى [worker/index.js](worker/index.js)، ثم اختر **Deploy**.
4. من العامل افتح **Settings → Variables and Secrets → Add**، واختر **Secret**. الاسم هو `OPENAI_API_KEY` والقيمة هي مفتاحك من [صفحة مفاتيح OpenAI](https://platform.openai.com/api-keys). ثم احفظ وانشر التغيير.
5. انسخ عنوان العامل الذي ينتهي بـ `.workers.dev`.
6. افتح [ai-config.js](ai-config.js) في GitHub وضع العنوان مع `/chat` في `endpoint`. مثال:
   `endpoint: "https://hamdi-photography-ai.your-subdomain.workers.dev/chat"`
7. احفظ التغيير. عند تحميل الموقع من جديد سيظهر المساعد متصلًا.

المفتاح سرّ خاص بالخادم. لا تلصقه في `ai-config.js` أو `index.html` أو أي ملف ينشره GitHub Pages. استخدام OpenAI API قد يتطلب إعداد الفوترة لدى OpenAI، وتُحسب التكلفة بحسب الاستخدام.

## النشر باستخدام Wrangler

من مجلد `worker` ثبّت Wrangler وسجّل الدخول، ثم نفّذ:

```sh
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

ألصق المفتاح في مطالبة الطرفية. بعد النشر انسخ عنوان `.workers.dev` وأضف `/chat` إلى نهايته داخل `ai-config.js`.

## اللغات والأسعار

يرد المساعد بالعربية أو التركية أو الإنجليزية حسب لغة الزائر. ويذكر أسعار السوق البحثية على أنها **مؤشرات تقريبية وليست أسعار حمدي الرسمية**، مع إحالة طلب السعر النهائي إلى واتساب. المصادر التي وُضعت في تعليمات الخادم:

- [Usta Pazar — نطاقات عامة للتصوير في تركيا](https://ustapazari.com/fiyat-hesaplama/fotografcilik)
- [Airview — مثال على تسعير تصوير المنتجات في غازي عنتاب](https://airviewtr.com/hizmetler/urun-cekimi)
- [Düğünara — أمثلة عروض تصوير الزفاف في غازي عنتاب](https://www.dugunara.com/nisan-fotografcisi/gaziantep)

إذا استخدمت نطاقًا أو دومينًا مخصصًا للموقع، أضف أصله إلى قائمة `ALLOWED_ORIGINS` في بداية ملف العامل قبل إعادة نشره.
