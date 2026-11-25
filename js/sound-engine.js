/**
 * Synthesized Sci-Fi Web Audio SFX + Thai Speech Narration Engine
 * Zero external audio dependencies — crisp procedural UI & AR sounds.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.speaking = false;
    this.currentUtterance = null;
    this.onSpeakStateChange = null;
  }

  _ensureCtx() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleMute() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stopSpeech();
    return this.enabled;
  }

  _tone(freq, duration, type = 'sine', volume = 0.08, delay = 0, slideTo = null) {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this._tone(680, 0.06, 'triangle', 0.055, 0, 880);
  }

  playTab() {
    this._tone(520, 0.07, 'sine', 0.05, 0, 740);
    this._tone(780, 0.05, 'sine', 0.035, 0.035);
  }

  playLockOn() {
    // Sci-Fi Hologram Lock-on arpeggio
    this._tone(392, 0.12, 'sine', 0.07, 0, 523);
    this._tone(587, 0.14, 'triangle', 0.07, 0.08, 784);
    this._tone(880, 0.24, 'sine', 0.08, 0.16, 1174);
  }

  playPop() {
    this._tone(240, 0.16, 'sine', 0.09, 0, 720);
    this._tone(520, 0.18, 'triangle', 0.06, 0.06, 1040);
  }

  playModeSwitch() {
    this._tone(420, 0.09, 'sawtooth', 0.028, 0, 640);
    this._tone(640, 0.11, 'sine', 0.055, 0.06, 920);
  }

  playFlip() {
    this._tone(480, 0.07, 'sine', 0.05, 0, 660);
  }

  playCorrect() {
    this._tone(523.25, 0.12, 'triangle', 0.08, 0);
    this._tone(659.25, 0.12, 'triangle', 0.08, 0.08);
    this._tone(783.99, 0.15, 'sine', 0.09, 0.16);
    this._tone(1046.5, 0.28, 'sine', 0.09, 0.24);
  }

  playWrong() {
    this._tone(260, 0.14, 'sawtooth', 0.045, 0, 190);
    this._tone(185, 0.2, 'sawtooth', 0.04, 0.12, 140);
  }

  playAchievement() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, i) => {
      this._tone(n, 0.22, 'triangle', 0.075, i * 0.075);
    });
  }

  playDigestStep() {
    this._tone(340, 0.1, 'sine', 0.05, 0, 510);
    this._tone(680, 0.12, 'triangle', 0.045, 0.07, 860);
  }

  speakThai(text) {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    if (!text) return false;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'th-TH';
    utter.rate = 1.02;
    utter.pitch = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const thVoice = voices.find((v) => v.lang.toLowerCase().includes('th'));
    if (thVoice) utter.voice = thVoice;

    utter.onstart = () => {
      this.speaking = true;
      this.onSpeakStateChange?.(true);
    };
    utter.onend = () => {
      this.speaking = false;
      this.onSpeakStateChange?.(false);
    };
    utter.onerror = () => {
      this.speaking = false;
      this.onSpeakStateChange?.(false);
    };

    this.currentUtterance = utter;
    window.speechSynthesis.speak(utter);
    return true;
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speaking = false;
    this.onSpeakStateChange?.(false);
  }
}

export const soundEngine = new SoundEngine();
