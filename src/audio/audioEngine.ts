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

export type AudioCue = "pump" | "gate" | "channel" | "inlet" | "wetting" | "verified" | "recovered" | "chirp" | "shutter";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private motorGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private on = false;
  private motorStepActive = false;
  private motorBoosted = false;
  private birdTimeout: number | null = null;
  private birdsAllowed = false;

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

    // Rain bed (fv-weather 电影化)：宽频雨幕嘶声随 stormProgress 淡入淡出。
    const rainNoise = this.noiseSource();
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 1600;
    rainFilter.Q.value = 0.4;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainNoise.connect(rainFilter).connect(this.rainGain).connect(master);
    rainNoise.start();
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
    this.motorStepActive = step === "drone-scan";
    this.applyMotor();
    const t = this.ctx.currentTime + 0.5;
    this.waterGain?.gain.linearRampToValueAtTime(step === "irrigation" ? 0.05 : 0, t);
  }

  /** FPV 云台视角时电机声增益（第一人称应该听得更响）。 */
  setMotorBoost(active: boolean) {
    if (this.motorBoosted === active) return;
    this.motorBoosted = active;
    this.applyMotor();
  }

  private applyMotor() {
    if (!this.ctx || !this.motorGain) return;
    const base = this.motorStepActive ? 0.07 : 0;
    const target = this.motorBoosted ? base * 2.3 : base;
    this.motorGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.4);
  }

  /**
   * 日相/暴雨环境声（fv-weather 电影化 + 音频入场）：清晨/白昼且无雨时
   * 铺一层极轻的合成鸟鸣（3-7s 随机间隔双音 blip），夜间与暴雨停鸟。
   */
  setDaylight(dayPhase: "dawn" | "day" | "dusk" | "night", storm: number) {
    const allowed = (dayPhase === "dawn" || dayPhase === "day") && storm < 0.2;
    if (allowed === this.birdsAllowed) return;
    this.birdsAllowed = allowed;
    if (allowed) this.scheduleBirdChirp();
    else if (this.birdTimeout !== null) {
      window.clearTimeout(this.birdTimeout);
      this.birdTimeout = null;
    }
  }

  private scheduleBirdChirp() {
    if (!this.birdsAllowed) return;
    this.birdTimeout = window.setTimeout(() => {
      if (this.on && this.birdsAllowed) this.birdChirp();
      this.scheduleBirdChirp();
    }, 3_000 + Math.random() * 4_000);
  }

  private birdChirp() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    for (let note = 0; note < 2; note += 1) {
      const at = now + note * 0.12;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note === 0 ? 2_400 : 1_850, at);
      oscillator.frequency.exponentialRampToValueAtTime(note === 0 ? 1_950 : 1_500, at + 0.09);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.02, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
      oscillator.connect(gain).connect(master);
      oscillator.start(at);
      oscillator.stop(at + 0.14);
    }
  }

  /** 雨声底随暴雨强度淡入淡出（0.8s ramp，播放分片触发已足够平滑）。 */
  setStorm(storm: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.8;
    const level = Math.min(1, Math.max(0, storm)) * 0.22;
    this.rainGain?.gain.linearRampToValueAtTime(level, t);
  }

  /**
   * 雷声（fv-weather 电影化）：低频棕噪轰鸣，起始一段高频 crack；delay 为
   * 相对闪电画面的延迟（0.6-1.6s，seeded），未开启声音时静默。
   */
  thunder(delaySeconds = 0) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.on) return;
    const at = ctx.currentTime + Math.max(0, delaySeconds);
    const source = this.noiseSource();
    source.loop = false;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(340, at);
    filter.frequency.exponentialRampToValueAtTime(96, at + 1.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    source.connect(filter).connect(gain).connect(master);
    source.start(at);
    source.stop(at + 1.4);
  }

  /** Short event-synchronised cues; ignored until the viewer enables sound. */
  sfx(cue: AudioCue) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.on) return;
    const now = ctx.currentTime;
    if (cue === "channel" || cue === "inlet" || cue === "wetting") {
      const source = this.noiseSource();
      source.loop = false;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = cue === "channel" ? 720 : cue === "inlet" ? 1_250 : 1_850;
      filter.Q.value = cue === "wetting" ? 0.45 : 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(cue === "wetting" ? 0.07 : 0.1, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      source.connect(filter).connect(gain).connect(master);
      source.start(now);
      source.stop(now + 0.46);
      return;
    }
    if (cue === "shutter") {
      // 快门双击：两次高频窄脉冲，模拟反光板/叶片快门的"嗒-嗒"。
      for (let click = 0; click < 2; click += 1) {
        const at = now + click * 0.07;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(click === 0 ? 1_750 : 1_180, at);
        oscillator.frequency.exponentialRampToValueAtTime(click === 0 ? 880 : 640, at + 0.045);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.075, at + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
        oscillator.connect(gain).connect(master);
        oscillator.start(at);
        oscillator.stop(at + 0.12);
      }
      return;
    }

    const tones: Record<Exclude<AudioCue, "channel" | "inlet" | "wetting" | "shutter">, [number, number, OscillatorType]> = {
      pump: [62, 118, "sine"],
      gate: [180, 108, "square"],
      verified: [392, 587, "sine"],
      recovered: [523, 784, "sine"],
      chirp: [1_250, 1_920, "sine"],
    };
    const [from, to, type] = tones[cue];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(cue === "pump" ? 0.08 : 0.055, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (cue === "recovered" ? 0.52 : 0.32));
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.56);
  }

  get isEnabled() { return this.on; }
  get isInitialised() { return this.ctx !== null; }
}

export const audioEngine = new AudioEngine();
