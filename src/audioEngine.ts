/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from "./types";

export const TRACKS: Track[] = [
  {
    id: "synthwave",
    title: "Cyber Grid Rider",
    artist: "SynthAI Beta",
    genre: "Synthwave",
    bpm: 120,
    description: "A driving retro-futuristic bassline paired with glowing melodic sweeps.",
    color: "fuchsia",
  },
  {
    id: "lofi-ambient",
    title: "Neon Chill Space",
    artist: "Lofi-Generator.01",
    genre: "Lofi Ambient",
    bpm: 90,
    description: "Deep soothing vintage tape-synth pads and slow resonant space melodies.",
    color: "cyan",
  },
  {
    id: "chiptune",
    title: "8-bit Arcade Frenzy",
    artist: "ChipProcessor-8",
    genre: "Retro Chiptune",
    bpm: 140,
    description: "Fast-paced square-wave arpeggios, springy pitch slides, and raw noise drums.",
    color: "lime",
  },
];

// Frequencies for musical notes
const NOTES = {
  // Octave 2
  A2: 110.00,
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  G2: 98.00,
  // Octave 3
  A3: 220.00,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196.00,
  F3: 174.61,
  B3: 246.94,
  // Octave 4
  A4: 440.00,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.00,
  B4: 493.88,
  // Octave 5
  A5: 880.00,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  B5: 987.77,
  F5: 698.46,
};

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  
  private currentTrack: Track = TRACKS[0];
  private isEngineRunning: boolean = false;
  private volume: number = 0.5;
  
  // Scheduler state
  private schedulerIntervalId: number | null = null;
  private nextNoteTime: number = 0.0;
  private currentStep: number = 0; // 0 to 15
  private scheduleAheadTime: number = 0.15; // how far ahead to schedule audio (seconds)
  private lookahead: number = 50.0; // how frequently to call scheduling function (in milliseconds)
  
  // Custom audio source buffers
  private noiseBuffer: AudioBuffer | null = null;
  
  // Subs for play states
  private onStepCallback: ((step: number) => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    // Left empty, deferred to first user interaction
  }

  private initAudio() {
    if (this.ctx) return;

    // Create audio context
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioCtx();
    
    // Create master structural routing nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128; // high speed responsive visualizer
    
    // Connect nodes
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    // Create white noise buffer for drums
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const channelData = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
  }

  public setOnStep(fn: (step: number) => void) {
    this.onStepCallback = fn;
  }

  public setOnStateChange(fn: (isPlaying: boolean) => void) {
    this.onStateChangeCallback = fn;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getTrack(): Track {
    return this.currentTrack;
  }

  public setTrack(trackId: string) {
    const found = TRACKS.find(t => t.id === trackId);
    if (found) {
      this.currentTrack = found;
      this.currentStep = 0;
      if (this.ctx) {
        this.nextNoteTime = this.ctx.currentTime + 0.05;
      }
    }
  }

  public getIsPlaying(): boolean {
    return this.isEngineRunning;
  }

  public togglePlay(): boolean {
    this.initAudio();
    if (!this.ctx) return false;

    if (this.isEngineRunning) {
      this.stop();
    } else {
      this.start();
    }
    return this.isEngineRunning;
  }

  public start() {
    this.initAudio();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.isEngineRunning = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerIntervalId = window.setInterval(() => this.scheduler(), this.lookahead);
    
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(true);
    }
  }

  public stop() {
    this.isEngineRunning = false;
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(false);
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0.0, Math.min(1.0, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private scheduler() {
    if (!this.ctx) return;
    
    // Schedule all beats that fit within our window
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.currentTrack.bpm;
    const sixteenthNoteDuration = secondsPerBeat / 4.0; // 16 steps per bar
    
    this.nextNoteTime += sixteenthNoteDuration;
    
    // Callback to UI (in setTimeout to avoid scheduling audio jitter)
    const stepRef = this.currentStep;
    if (this.onStepCallback) {
      setTimeout(() => {
        if (this.isEngineRunning && this.onStepCallback) {
          this.onStepCallback(stepRef);
        }
      }, 0);
    }
    
    this.currentStep = (this.currentStep + 1) % 16;
  }

  // Synthesis methods
  private playBass(frequency: number, time: number, duration: number, type: OscillatorType = "sawtooth") {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    
    // Warm low-pass envelope
    filter.type = "lowpass";
    filter.Q.setValueAtTime(6, time);
    filter.frequency.setValueAtTime(120, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + 0.02);
    filter.frequency.exponentialRampToValueAtTime(100, time + duration);

    // Fade out volume envelope
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + duration);
  }

  private playLead(frequency: number, time: number, duration: number, type: OscillatorType = "square") {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const oscDetune = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);

    oscDetune.type = type;
    oscDetune.frequency.setValueAtTime(frequency + 4, time); // detune effect
    
    // Filter sweep envelope
    filter.type = "bandpass";
    filter.Q.setValueAtTime(2, time);
    filter.frequency.setValueAtTime(1500, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + duration);

    // Envelope volume
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    oscDetune.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(time);
    oscDetune.start(time);
    osc.stop(time + duration);
    oscDetune.stop(time + duration);
  }

  private playHiHat(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    
    filter.type = "highpass";
    filter.frequency.setValueAtTime(8000, time);

    const volume = isAccent ? 0.08 : 0.03;
    const decay = isAccent ? 0.07 : 0.04;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
    source.stop(time + decay);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Component 1: White noise crack
    const noiseSource = this.ctx.createBufferSource();
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    noiseSource.buffer = this.noiseBuffer;
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(1200, time);

    noiseGain.gain.setValueAtTime(0.05, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(time);
    noiseSource.stop(time + 0.15);

    // Component 2: Low-end snap
    const toneOsc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();

    toneOsc.type = "triangle";
    toneOsc.frequency.setValueAtTime(180, time);
    toneOsc.frequency.exponentialRampToValueAtTime(100, time + 0.08);

    toneGain.gain.setValueAtTime(0.08, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    toneOsc.connect(toneGain);
    toneGain.connect(this.masterGain);

    toneOsc.start(time);
    toneOsc.stop(time + 0.08);
  }

  // Synthesize Eat food beep sound
  public playEatEffect() {
    this.initAudio();
    if (!this.ctx || !this.masterGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High energetic retro pitch arpeggio sweep!
    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.setValueAtTime(900, time + 0.05);
    osc.frequency.setValueAtTime(1200, time + 0.1);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  // Synthesize snake crash sound effect
  public playCrashEffect() {
    this.initAudio();
    if (!this.ctx || !this.masterGain) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Low rumble sliding down crash
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.4);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

    // Create a filter to make it dusty/muffled
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.55);
  }

  private scheduleStep(step: number, time: number) {
    if (this.currentTrack.id === "synthwave") {
      this.scheduleSynthwave(step, time);
    } else if (this.currentTrack.id === "lofi-ambient") {
      this.scheduleLofi(step, time);
    } else if (this.currentTrack.id === "chiptune") {
      this.scheduleChiptune(step, time);
    }
  }

  // Track 1 Logic
  private scheduleSynthwave(step: number, time: number) {
    const secondsPerStep = 60.0 / this.currentTrack.bpm / 4.0;
    
    // Bass Walk Sequence (A2 minor chord key structure)
    const bassline = [
      NOTES.A2, NOTES.A2, NOTES.A2, NOTES.A2, 
      NOTES.C2, NOTES.C2, NOTES.E2, NOTES.E2, 
      NOTES.G2, NOTES.G2, NOTES.G2, NOTES.G2, 
      NOTES.D2, NOTES.D2, NOTES.E2, NOTES.G2
    ];
    this.playBass(bassline[step], time, secondsPerStep * 0.9, "sawtooth");

    // Melody Sequence
    const melody = [
      NOTES.A4, 0, NOTES.E5, 0, 
      NOTES.C5, 0, NOTES.A4, NOTES.B4, 
      0, NOTES.G4, NOTES.A4, 0, 
      NOTES.E4, 0, NOTES.G4, 0
    ];
    if (melody[step] > 0) {
      this.playLead(melody[step], time, secondsPerStep * 1.8, "sawtooth");
    }

    // Drums
    // Snare on beat 2 (step 4) and beat 4 (step 12)
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }
    
    // Hi-Hats on eighth notes (even steps)
    if (step % 2 === 0) {
      this.playHiHat(time, step % 4 === 0);
    }
  }

  // Track 2 Logic (Lofi Deep/Ambient)
  private scheduleLofi(step: number, time: number) {
    const secondsPerStep = 60.0 / this.currentTrack.bpm / 4.0;

    // Slow-paced chords / bass (using triangle waves for soft tape saturation style)
    const bassline = [
      NOTES.F3, NOTES.F3, NOTES.F3, NOTES.F3,
      NOTES.C3, NOTES.C3, NOTES.C3, NOTES.C3,
      NOTES.G3, NOTES.G3, NOTES.G3, NOTES.G3,
      NOTES.A3, NOTES.A3, NOTES.E3, NOTES.E3
    ];
    
    // Play softer bass triggers on main beats
    if (step % 4 === 0) {
      this.playBass(bassline[step], time, secondsPerStep * 3.5, "triangle");
    }

    // Lazy, spacious ambient melody
    const melody = [
      NOTES.E4, 0, 0, NOTES.G4,
      0, 0, NOTES.C5, 0,
      NOTES.A4, 0, 0, NOTES.E4,
      0, NOTES.D4, 0, 0
    ];
    
    if (melody[step] > 0) {
      this.playLead(melody[step], time, secondsPerStep * 3.0, "sine");
    }

    // Laid back brush high hats
    if (step % 4 === 2) {
      this.playHiHat(time, false);
    }

    // Lazy click snare on step 8
    if (step === 8) {
      this.playHiHat(time, true); // softer snare
    }
  }

  // Track 3 Logic (8-bit Classic Chiptune)
  private scheduleChiptune(step: number, time: number) {
    const secondsPerStep = 60.0 / this.currentTrack.bpm / 4.0;

    // Fast bouncy bassline
    const bassline = [
      NOTES.A3, NOTES.G3, NOTES.A3, NOTES.C4,
      NOTES.D3, NOTES.C3, NOTES.D3, NOTES.F3,
      NOTES.G3, NOTES.F3, NOTES.G3, NOTES.B3,
      NOTES.E3, NOTES.D3, NOTES.E3, NOTES.G3
    ];
    this.playBass(bassline[step], time, secondsPerStep * 0.7, "square");

    // Fast rapid pentatonic arpeggio leads (reproduces classic 8-bit tracking!)
    const melody = [
      NOTES.A5, NOTES.C5, NOTES.E5, NOTES.A5,
      NOTES.D5, NOTES.F5, NOTES.A5, NOTES.D5,
      NOTES.G5, NOTES.B5, NOTES.D5, NOTES.G5,
      NOTES.E5, NOTES.G5, NOTES.B5, NOTES.E5
    ];
    
    // Play arpeggiator sweeps on every odd step
    if (step % 2 === 1) {
      const scaleDegree = melody[step];
      // 8bit chiptune dynamic sweep arpeggio
      const fastArpNote = scaleDegree;
      this.playLead(fastArpNote, time, secondsPerStep * 0.5, "triangle");
    }

    // Pure noisy chiptune beats
    if (step % 4 === 0) {
      // Bouncy noisy kick snare beat
      if (step === 0 || step === 8) {
        this.playBass(NOTES.C2, time, secondsPerStep * 0.8, "triangle"); // pure low kick sweep
      } else {
        this.playSnare(time);
      }
    }
    
    // Fast high hats/noise clicks
    if (step % 2 === 1) {
      this.playHiHat(time, false);
    }
  }
}

// Single singleton instance
export const audioEngine = new ProceduralAudioEngine();
