/**
 * Zimelia Voice FX
 * Applies a light character filter to TTS audio via the Web Audio API.
 * Does not generate speech — only processes an existing audio blob.
 */

export class ZimeliaVoiceFX {
  /**
   * @param {HTMLAudioElement} audioEl
   */
  constructor(audioEl) {
    this.audio = audioEl;
    this.enabled = true;
    this.intensity = 0.45; // 0–1
    this.ctx = null;
    this.source = null;
    this.filter = null;
    this.gain = null;
    this.ready = false;
  }

  /**
   * Must be called from a user gesture the first time (browser autoplay rules).
   */
  async initialize() {
    if (this.ready) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.source = this.ctx.createMediaElementSource(this.audio);
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.gain = this.ctx.createGain();
    this.source.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this._applyParams();
    this.ready = true;
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = !!on;
    this._applyParams();
  }

  /**
   * @param {number} value 0–1
   */
  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, Number(value) || 0));
    this._applyParams();
  }

  /**
   * Play an audio blob through the effect chain.
   * @param {Blob} blob
   */
  async play(blob) {
    if (!blob) return;
    if (this.enabled && !this.ready) {
      try { await this.initialize(); } catch (e) { /* fall through to plain play */ }
    }
    const url = URL.createObjectURL(blob);
    this.audio.src = url;
    this.audio.onended = () => URL.revokeObjectURL(url);
    if (this.ctx && this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (e) {}
    }
    await this.audio.play();
  }

  _applyParams() {
    if (!this.filter || !this.gain) return;
    if (!this.enabled) {
      this.filter.frequency.value = 20000;
      this.gain.gain.value = 1;
      return;
    }
    // Softer, slightly warmer voice as intensity rises
    const freq = 18000 - this.intensity * 12000; // 18k → 6k
    this.filter.frequency.value = Math.max(4000, freq);
    this.filter.Q.value = 0.7;
    this.gain.gain.value = 1;
  }
}
