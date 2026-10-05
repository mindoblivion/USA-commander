/**
 * Tactical Web Audio & Voice Synthesizer
 * Generates all game sound effects procedurally with zero external dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVol: number = 0.8;
  private sfxVol: number = 0.85;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.sfxGain.connect(this.masterGain);
        this.updateVolumes(this.masterVol, this.sfxVol);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateVolumes(master: number, sfx: number) {
    this.masterVol = master;
    this.sfxVol = sfx;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : master, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(sfx, this.ctx.currentTime);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : this.masterVol, this.ctx.currentTime);
    }
  }

  /**
   * Powerful tactical explosion sound with white noise burst and deep resonant body
   */
  public playExplosion(intensity: number = 1.0) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const duration = 0.8 + intensity * 0.9;

      // 1. Noise buffer for explosion crunch
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Lowpass filter for deep blast
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 * intensity, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7 * intensity, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + duration);

      // 2. Sub-bass punch oscillator
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140 * intensity, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.4);

      subGain.gain.setValueAtTime(0.9 * intensity, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      subOsc.start(now);
      subOsc.stop(now + 0.5);
    } catch {
      // Audio fallback silent
    }
  }

  /**
   * Jet aircraft fast flyby swoosh
   */
  public playJetFlyby() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const duration = 1.4;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      filter.type = 'bandpass';
      filter.Q.value = 3;

      // Doppler shift effect
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.linearRampToValueAtTime(1200, now + 0.6);
      filter.frequency.exponentialRampToValueAtTime(250, now + duration);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tactical salvage / bounty collection chime
   */
  public playLootChime(rarity: 'common' | 'rare' | 'legendary' | 'mythic') {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const frequencies = rarity === 'mythic' ? [523.25, 659.25, 783.99, 1046.50] :
                          rarity === 'legendary' ? [440, 554.37, 659.25] :
                          rarity === 'rare' ? [392, 493.88] : [330];

      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.9);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.9);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Cash pickup / reward register ring
   */
  public playCashEarned() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Nuclear alarm siren / ICBM warhead launch
   */
  public playNuclearAlarm() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const duration = 2.4;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      // Siren pitch cycle
      for (let t = 0; t < duration; t += 0.6) {
        osc.frequency.setValueAtTime(440, now + t);
        osc.frequency.linearRampToValueAtTime(880, now + t + 0.3);
        osc.frequency.linearRampToValueAtTime(440, now + t + 0.6);
      }

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tactical radio squelch / confirm beep
   */
  public playRadioClick() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.setValueAtTime(1800, now + 0.03);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Direct Presidential Voice Dispatch using Web Speech API
   */
  public speakPresidentialOrder(text: string, enabled: boolean = true, volume: number = 0.9) {
    if (!enabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05; // Confident, brisk delivery
      utterance.pitch = 0.88; // Lower presidential tone
      utterance.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      // Look for authoritative English voices
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Natural') || v.name.includes('US'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech fallback
    }
  }
}

export const soundEngine = new SoundEngine();
