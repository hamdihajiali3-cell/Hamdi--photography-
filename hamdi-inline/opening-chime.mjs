// A short original chime, synthesized on the device without a download or microphone.
export class OpeningChime {
  constructor(Context = globalThis.AudioContext || globalThis.webkitAudioContext) {
    this.Context = Context;
    this.generation = 0;
    this.nodes = [];
  }

  stop() {
    ++this.generation;
    clearTimeout(this.timer);
    for (const node of this.nodes) {
      try { node.stop?.(); } catch {}
      try { node.disconnect(); } catch {}
    }
    this.nodes = [];
  }

  async play() {
    this.stop();
    if (!this.Context) return false;
    const generation = this.generation;
    try {
      if (!this.context || this.context.state === 'closed') this.context = new this.Context();
      const context = this.context;
      if (context.state !== 'running') await context.resume();
      if (generation !== this.generation) return false;
      const start = context.currentTime;
      for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const at = start + index * .1;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(.035 - index * .004, at + .025);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + .85);
        envelope.gain.linearRampToValueAtTime(0, at + .9);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        this.nodes.push(oscillator, envelope);
        oscillator.start(at);
        oscillator.stop(at + .91);
      }
      this.timer = setTimeout(() => { if (generation === this.generation) this.stop(); }, 1250);
      return true;
    } catch {
      if (generation === this.generation) this.stop();
      return false;
    }
  }
}
