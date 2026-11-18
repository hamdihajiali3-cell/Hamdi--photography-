const consentKey = 'hamdi-voice-consent-v1';

export class AutomaticVoice {
  constructor({ storage, canStart, showConsent, start }) {
    Object.assign(this, { storage, canStart, showConsent, start });
    this.pending = false;
    this.acceptedHere = false;
  }
  hasConsent() {
    if (this.acceptedHere) return true;
    try { return this.storage()?.getItem(consentKey) === 'adult-and-audio'; }
    catch { return false; }
  }
  request() {
    if (!this.canStart() || this.pending) return false;
    if (!this.hasConsent()) { this.showConsent(); return false; }
    return this.begin();
  }
  accept(adult, audio) {
    if (adult !== true || audio !== true || !this.canStart()) return false;
    this.acceptedHere = true;
    try { this.storage()?.setItem(consentKey, 'adult-and-audio'); } catch {}
    return this.begin();
  }
  async begin() {
    if (this.pending || !this.canStart() || !this.hasConsent()) return false;
    this.pending = true;
    try { await this.start(); return true; }
    finally { this.pending = false; }
  }
}

export async function activateVoiceAudio(context, timeout = 2500) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(context.resume()).then(() => context.state === 'running', () => false),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), timeout); })
    ]);
  } catch { return false; }
  finally { clearTimeout(timer); }
}
