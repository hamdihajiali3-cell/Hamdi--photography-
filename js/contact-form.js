import { translations } from "./translations.js";

export function initContactForm() {
  const form = document.getElementById("directContactForm");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (id) => document.getElementById(id)?.value?.trim() || "";
    const name = value("clientName");
    const service = value("sessionType");
    const phone = value("clientPhone");
    const message = value("clientMsg");
    const channel = value("contactChannel") || "whatsapp";
    const email = value("clientEmail");
    const copy = translations[document.documentElement.lang] || translations.ar;
    const lines = [
      copy.waIntro + " " + name,
      copy.waBooking + ": " + service,
      phone ? copy.waPhone + ": " + phone : "",
      message ? copy.waDetails + ": " + message : ""
    ].filter(Boolean);
    if (channel === "email") {
      if (!email) return document.getElementById("clientEmail")?.reportValidity();
      const body = lines.join("\n") + "\n" + copy.waEmail + ": " + email;
      const url = "https://mail.google.com/mail/?view=cm&fs=1&to=" +
        encodeURIComponent("hamdihajiali76@gmail.com") +
        "&su=" + encodeURIComponent(copy.emailSubject) +
        "&body=" + encodeURIComponent(body);
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (channel === "sms") {
      window.location.href = "sms:+905377423671?body=" + encodeURIComponent(lines.join("\n"));
    } else {
      window.open("https://wa.me/905377423671?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener,noreferrer");
    }
  });
}
