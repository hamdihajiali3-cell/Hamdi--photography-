# تفعيل مساعد Hamdi Photography بأمان

الموقع يبقى على GitHub Pages، والمحادثة تمرّ عبر Cloudflare Worker إلى OpenAI Responses API. مفتاح OpenAI لا يوضع في GitHub أو ملفات الموقع أو المحادثة.

## إعداد Worker

إعداد Cloudflare يجب أن يستخدم المستودع نفسه، فرع main، ومجلد الجذر cloudflare-worker. اترك أمر البناء فارغًا، وأمر النشر:
    npx wrangler deploy

ملف wrangler.toml يحدد اسم Worker والعنوان المسموح ونموذج gpt-6-luna. ملف ai-config.js في جذر الموقع يحتوي عنوان Worker العام فقط.

## مفتاح OpenAI

1. ألغِ أي مفتاح سبق مشاركته في محادثة أو إضافته إلى مستودع، ثم أنشئ مفتاحًا جديدًا.
2. إذا اخترت صلاحيات مقيّدة، اسمح بإنشاء Responses (Write). صلاحية القراءة فقط لا تكفي.
3. من Cloudflare افتح Worker hamdi--photography ثم Settings ثم Variables and Secrets، وأضف Secret باسم OPENAI_API_KEY في Production.
4. ألصق المفتاح الجديد مباشرة في حقل Cloudflare Secret، ثم احفظ وانشر التغيير. لا تضفه إلى متغيرات البناء أو أي ملف في GitHub.

يمكن بدل لوحة Cloudflare ضبط السر عبر الطرفية:
    cd cloudflare-worker
    npx wrangler login
    npx wrangler secret put OPENAI_API_KEY
    npx wrangler deploy

لا تضع السر داخل ai-config.js. هذا الملف عام ويحتوي عنوان Worker فقط.

## الفحص

افتح https://hamdi--photography.hamdihajiali3.workers.dev/api/health؛ يجب أن يظهر {"ok":true}. افتح الموقع وجرب زر المساعد. إذا ظهر خطأ نقص المفتاح، أضف OPENAI_API_KEY كـ Secret في Production ثم أعد النشر.

الخادم يسمح بطلبات المحادثة القادمة من أصل GitHub Pages فقط، ويحد طول الرسائل وسجل المحادثة، ويطبّق حدًا تقريبيًا قدره 10 طلبات في الدقيقة لكل عنوان IP عند توفر ربط حد الطلبات. لا يثبت المساعد توفر موعد؛ حمدي يؤكد التفاصيل عبر واتساب.
