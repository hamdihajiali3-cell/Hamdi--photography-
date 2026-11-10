class HamdiMicrophone extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.chunk = new Int16Array(512);
    this.position = 0;
    this.outputRate = options?.processorOptions?.outputRate || sampleRate;
    this.filled = 0;
    this.weighted = 0;
  }

  pushSample(sample) {
    const value = Math.max(-1, Math.min(1, sample));
    this.chunk[this.position++] = value < 0 ? value * 32768 : value * 32767;
    if (this.position !== this.chunk.length) return;
    const bytes = new ArrayBuffer(this.chunk.length * 2);
    const view = new DataView(bytes);
    for (let i = 0; i < this.chunk.length; i++) view.setInt16(i * 2, this.chunk[i], true);
    this.port.postMessage(bytes, [bytes]);
    this.position = 0;
  }

  process(inputs) {
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    for (const sample of samples) {
      if (this.outputRate === sampleRate) {
        this.pushSample(sample);
        continue;
      }
      // Preserve fractional sample boundaries across worklet blocks.
      let remaining = this.outputRate;
      while (remaining > 0) {
        const weight = Math.min(remaining, sampleRate - this.filled);
        this.weighted += sample * weight;
        this.filled += weight;
        remaining -= weight;
        if (this.filled === sampleRate) {
          this.pushSample(this.weighted / sampleRate);
          this.filled = this.weighted = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('hamdi-microphone', HamdiMicrophone);
