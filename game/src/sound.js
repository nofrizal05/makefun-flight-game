// Small WebAudio sounds, synthesised at run time — no audio files to ship.
// Created on the first user gesture; silent in screenshot (shot) mode.
export class Sound {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.enabled = true;
  }

  unlock() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 52;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      this.engine = { osc, gain, filter };
    } catch {
      this.ctx = null;
    }
  }

  /** Engine hum follows throttle and speed; call every frame. */
  engineHum(throttle, speed, onGround) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = onGround && speed < 1 ? 0 : 0.018 + throttle * 0.03;
    this.engine.gain.gain.setTargetAtTime(this.enabled ? target : 0, t, 0.15);
    this.engine.osc.frequency.setTargetAtTime(46 + throttle * 42 + speed * 0.25, t, 0.2);
  }

  beep(freq = 880, seconds = 0.12, type = 'sine') {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + seconds);
  }

  ring() {
    this.beep(880, 0.1);
    setTimeout(() => this.beep(1318, 0.16), 90);
  }

  thud() {
    this.beep(90, 0.3, 'triangle');
  }
}
