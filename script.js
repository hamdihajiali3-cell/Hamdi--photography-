const t = {
  "ar": {
    "nameError": "اكتب اسمك قبل المتابعة.",
    "colorTitle": "تعديل ألوان الصور",
    "graduationTitle": "تصوير التخرّج",
    "hairTitle": "تصوير الحلاقة وقصّات الشعر",
    "idTitle": "صور الجواز والهويات",
    "portraitTitle": "تصوير شخصي",
    "mTitle": "طلب موعد جديد — Hamdi Photography",
    "mService": "الخدمة",
    "mName": "الاسم",
    "mDate": "التاريخ المناسب",
    "mTime": "الوقت المناسب",
    "mDetails": "التفاصيل",
    "bookingPending": "الموعد يُؤكَّد بعد التواصل مع حمدي.",
    "subject": "طلب موعد",
    "gmailStatus": "فُتحت Gmail برسالة الطلب. راجعها ثم أرسلها.",
    "draftReady": "الرسالة جاهزة. اضغط فتح الرسالة لإكمال الإرسال."
  },
  "tr": {
    "nameError": "Devam etmek için adını yaz.",
    "colorTitle": "Fotoğraf renk düzenleme",
    "graduationTitle": "Mezuniyet çekimi",
    "hairTitle": "Berber ve saç kesimi çekimi",
    "idTitle": "Pasaport ve kimlik fotoğrafları",
    "portraitTitle": "Portre çekimi",
    "mTitle": "Yeni randevu talebi — Hamdi Photography",
    "mService": "Hizmet",
    "mName": "Ad",
    "mDate": "Uygun tarih",
    "mTime": "Uygun saat",
    "mDetails": "Ayrıntılar",
    "bookingPending": "Randevu, Hamdi ile görüşüldükten sonra onaylanır.",
    "subject": "Randevu talebi",
    "gmailStatus": "Talep mesajı Gmail’de açıldı. Gözden geçirip gönder.",
    "draftReady": "Mesaj hazır. Göndermek için hazır mesajı aç."
  }
};

const lang = document.documentElement.lang === "tr" ? "tr" : "ar";
const form = document.querySelector("#booking");
const select = document.querySelector("#booking-service");
const status = document.querySelector("#booking-status");
const email = "hamdihajiali76@gmail.com";

const languageLinks = document.querySelectorAll("[data-lang]");
function updateLanguageLinks() {
  const current = new URL(location.href);
  current.searchParams.delete("bookingService");
  for (const link of languageLinks) {
    const target = new URL(link.href);
    target.search = current.search;
    target.hash = current.hash;
    link.href = target.href;
  }
}
updateLanguageLinks();
window.addEventListener("hashchange", updateLanguageLinks);
for (const link of languageLinks) link.addEventListener("click", updateLanguageLinks);

document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', event => {
  if (event.defaultPrevented) return;
  const manual = document.querySelector('#manual-booking-section');
  if (manual) manual.hidden = false;
  select.value = button.dataset.service;
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => document.querySelector('#booking-name').focus({ preventScroll: true }), 500);
}));
// The customer reviews and sends the draft in Gmail.
const draftLink = document.querySelector('#booking-open-draft');
const nameInput = document.querySelector('#booking-name');
function clearDraft() {
  status.textContent = '';
  const link = document.querySelector('#booking-open-draft');
  if (link) { link.hidden = true; link.removeAttribute('href'); }
}
form.addEventListener('input', () => { nameInput.setCustomValidity(''); clearDraft(); });
form.addEventListener('change', clearDraft);
form.addEventListener('submit', e => {
  e.preventDefault();
  const c = t[lang], d = new FormData(form);
  const get = key => String(d.get(key) || '').trim();
  nameInput.setCustomValidity(get('name') ? '' : c.nameError);
  if (!form.reportValidity()) return;
  const names = { color:c.colorTitle, graduation:c.graduationTitle, hair:c.hairTitle, id:c.idTitle, portrait:c.portraitTitle };
  if (!Object.hasOwn(names, get('service'))) return;
  const lines = [
    c.mTitle,
    `${c.mService}: ${names[get('service')]}`,
    `${c.mName}: ${get('name')}`,
    get('date') && `${c.mDate}: ${get('date')}`,
    get('time') && `${c.mTime}: ${get('time')}`,
    get('details') && `${c.mDetails}: ${get('details')}`,
    '', c.bookingPending
  ].filter(line => line !== false);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`${c.subject} — ${names[get('service')]}`)}&body=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;
  const popup = window.open(url, '_blank');
  if (popup) popup.opener = null;
  draftLink.href = url;
  draftLink.hidden = Boolean(popup);
  status.textContent = popup ? c.gmailStatus : c.draftReady;
});
