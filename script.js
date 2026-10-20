// نظام تبديل اللغات الثلاث (عربي، تركي، إنجليزي)
const translations = {
  ar: {
    heroTitle: "الحياة، بنظرة<br><em>مختلفة تماماً.</em>",
    heroDesc: "كل لقطة تحكي شعوراً. اكتشف التصوير السينمائي، البورتريهات التي لا تُنسى، والقصص البصرية المصنوعة بشغف وعناية."
  },
  tr: {
    heroTitle: "Hayata,<br><em>farklı bir bakış.</em>",
    heroDesc: "Her kare bir duygu barındırır. Sinematik fotoğrafçılığı, unutulmaz portreleri ve tutkuyla üretilen hikayeleri keşfedin."
  },
  en: {
    heroTitle: "Life, in a<br><em>different light.</em>",
    heroDesc: "Every frame holds a feeling. Discover cinematic photography, unforgettable portraits, and visual stories created with intention."
  }
};

window.setLanguage = function(lang) {
  const title = document.getElementById('hero-title');
  const desc = document.getElementById('hero-desc');
  if (translations[lang]) {
    title.innerHTML = translations[lang].heroTitle;
    desc.textContent = translations[lang].heroDesc;
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // تحديث السنة تلقائياً
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // إرسال الطلب بشكل فوري ومباشر للواتساب بدون أخطاء إيميل
  const directForm = document.getElementById('directContactForm');
  if (directForm) {
    directForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('clientName').value;
      const session = document.getElementById('sessionType').value;
      const msg = document.getElementById('clientMsg').value;

      const text = `مرحباً، أنا ${name}\nأريد حجز: ${session}\nالتفاصيل: ${msg}`;
      const whatsappUrl = `https://wa.me/905377423671?text=${encodeURIComponent(text)}`;
      
      window.open(whatsappUrl, '_blank');
    });
  }
});
