# Hamdi Photography

الموقع المنشور: [Hamdi Photography](https://hamdihajiali3-cell.github.io/Hamdi--photography-/)

## المساعد الذكي

يحتوي المستودع على واجهة محادثة بالعربية والتركية والإنجليزية، وخادم Cloudflare Worker يتصل بـ OpenAI من جهة الخادم. لتفعيل الردود الحقيقية، اتبع خطوات النشر وإضافة مفتاح API السري في [دليل تفعيل المساعد](AI_SETUP.md).

يظهر المساعد في الموقع بوضع «غير متصل» إلى أن تنشر الخادم وتضع عنوانه في `ai-config.js`. لا تضع مفتاح OpenAI في ملفات الموقع العامة.

## الملفات الرئيسية

- `index.html`, `style.css`, `script.js`: الموقع.
- `ai-assistant.js`, `ai-assistant.css`, `ai-config.js`: واجهة المساعد وإعداد عنوان الخادم.
- `worker/index.js`, `worker/wrangler.toml`: خادم الذكاء الاصطناعي وإعداد نشره.
