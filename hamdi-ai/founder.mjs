export const FOUNDER_COPY = Object.freeze({
  ar: Object.freeze({
    listen: 'مين حمدي؟', stop: 'إيقاف التعريف',
    introduction: 'خلّيني عرّفك على حمدي. هو مصوّر فوتوغرافي من تركمان سوريا، وُلد بقرية البدروسية بمحافظة اللاذقية. حمدي مؤسّس Hamdi Photography وصاحب فكرة هالموقع، اللي جمع فيه خدمات التصوير والحجز والمساعد الصوتي بالعربي والتركي.',
    loading: 'لحظة، رح عرّفك عليه…', playing: 'عم عرّفك على حمدي.', stopped: 'توقّف التعريف الصوتي.',
    error: 'تعذّر تشغيل الصوت الآن. فيك تحاول مرة ثانية، والتعريف مكتوب قدّامك.'
  }),
  tr: Object.freeze({
    listen: 'Hamdi kim?', stop: 'Tanıtımı durdur',
    introduction: 'Sana Hamdi’yi tanıtayım. Kendisi Suriye Türkmenlerinden bir fotoğrafçı. Lazkiye ilinin Bedrusiye köyünde doğdu. Hamdi Photography’nin kurucusu ve bu sitenin fikir sahibi. Fotoğraf hizmetlerini, randevu talebini ve sesli asistanı bu sitede Arapça ve Türkçe bir araya getirdi.',
    loading: 'Birazdan seni Hamdi ile tanıştıracağım…', playing: 'Hamdi’yi tanıtıyorum.', stopped: 'Sesli tanıtım durduruldu.',
    error: 'Ses şu anda oynatılamıyor. Yeniden deneyebilirsin; tanıtım metni ekranda.'
  })
});

// Fixed studio copy only; playing the introduction does not open the microphone.
export const biographyUrl = language => ['ar', 'tr'].includes(language)
  ? `/api/order/prompt/aoede-v1/${language}/biography.wav` : null;

export class FounderIntroduction {
  constructor({ button, panel, description, status, beforePlay = () => {}, createAudio = src => new Audio(src) }) {
    Object.assign(this, { button, panel, description, status, beforePlay, createAudio });
    this.label = button.querySelector('[data-founder-label]');
    this.icon = button.querySelector('[data-founder-icon]');
    this.attempt = 0;
    this.active = false;
    button.addEventListener('click', () => this.active ? this.stop() : this.start());
    this.setLanguage('ar');
    button.hidden = false;
  }

  setLanguage(language) {
    if (!Object.hasOwn(FOUNDER_COPY, language)) return;
    this.stop('');
    this.language = language;
    this.copy = FOUNDER_COPY[language];
    this.description.textContent = this.copy.introduction;
    this.render(false);
  }

  render(active, message = '', loading = false) {
    this.active = active;
    this.button.setAttribute('aria-pressed', String(active));
    this.button.setAttribute('aria-busy', String(loading));
    this.label.textContent = active ? this.copy.stop : this.copy?.listen || '';
    this.icon.textContent = active ? '■' : '▶';
    this.status.textContent = message;
  }

  stop(message = this.copy?.stopped || '') {
    ++this.attempt;
    clearTimeout(this.timer);
    if (this.audio) {
      this.audio.onplaying = this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio = null;
    }
    this.render(false, message);
  }

  start() {
    if (this.button.disabled) return;
    const src = biographyUrl(this.language);
    if (!src) return;
    this.beforePlay();
    this.stop('');
    this.panel.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    const attempt = this.attempt;
    const failed = () => { if (attempt === this.attempt) this.stop(this.copy.error); };
    this.render(true, this.copy.loading, true);
    this.timer = setTimeout(failed, 30000);
    try {
      const audio = this.audio = this.createAudio(src);
      audio.preload = 'none';
      audio.onplaying = () => {
        if (attempt !== this.attempt) return;
        clearTimeout(this.timer);
        this.render(true, this.copy.playing);
      };
      audio.onended = () => { if (attempt === this.attempt) this.stop(''); };
      audio.onerror = failed;
      Promise.resolve(audio.play()).catch(failed);
    } catch { failed(); }
  }
}
