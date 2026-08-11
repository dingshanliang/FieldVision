/**
 * 合成式音频导演（fv-66y.4 原型）。无外部音频文件——用 WebAudio 合成：
 *  - 持续环境底噪（brown-ish noise → lowpass ≈ 户外空气/风）
 *  - 章节联动 SFX：drone-scan 起 低频马达嗡鸣（sine），irrigation 起 水流嘶嘶（bandpass noise）
 * 各 SFX 用 gain ramp 进出，不切换文件。真实 CC0 资产可后续替换 createNoiseSource/
 * 振荡器为 <audio> 元素 / AudioBufferSourceNode，接口（init/setEnabled/setChapter）不变。
 *
 * 必须在用户手势内调用 init()（autoplay 策略），故由 SoundToggle 的点击驱动。
 * 默认关闭，不影响既有静默体验。
 */
import type { DemoStep } from "../types/farm";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private motorGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private on = false;

  /** Lazily build the graph. Call inside a user gesture (click). No-op if unsupported. */
  init() {
    if (this.ctx) return;
    const Ctor =
      typeof window !== "undefined"
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Ambient air bed.
    const ambientNoise = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 460;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.16;
    ambientNoise.connect(lp).connect(this.ambientGain).connect(master);
    ambientNoise.start();

    // Drone motor hum (active during drone-scan).
    const motor = ctx.createOscillator();
    motor.type = "sine";
    motor.frequency.value = 76;
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    motor.connect(this.motorGain).connect(master);
    motor.start();

    // Water hiss (active during irrigation).
    const waterNoise = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1700;
    bp.Q.value = 0.6;
    this.waterGain = ctx.createGain();
    this.waterGain.gain.value = 0;
    waterNoise.connect(bp).connect(this.waterGain).connect(master);
    waterNoise.start();
  }

  private noiseSource(): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3.0;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    return src;
  }

  async setEnabled(on: boolean) {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    this.on = on;
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, this.ctx.currentTime + 0.4);
  }

  setChapter(step: DemoStep) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.5;
    this.motorGain?.gain.linearRampToValueAtTime(step === "drone-scan" ? 0.07 : 0, t);
    this.waterGain?.gain.linearRampToValueAtTime(step === "irrigation" ? 0.05 : 0, t);
  }

  get isEnabled() { return this.on; }
  get isInitialised() { return this.ctx !== null; }
}

export const audioEngine = new AudioEngine();
