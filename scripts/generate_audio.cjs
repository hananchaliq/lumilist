const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

function writeWavFile(filename, sampleRate, durationSec, sampleFn) {
  const numChannels = 2;
  const bytesPerSample = 2;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const [left, right] = sampleFn(t, i, totalSamples);
    const clampedLeft = Math.max(-0.95, Math.min(0.95, left));
    const clampedRight = Math.max(-0.95, Math.min(0.95, right));
    buffer.writeInt16LE(Math.floor(clampedLeft * 32767), offset);
    buffer.writeInt16LE(Math.floor(clampedRight * 32767), offset + 2);
    offset += 4;
  }

  const filePath = path.join(audioDir, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved ${filename} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

// 1. Lofi Midnight Chill (warm Rhodes, mellow lofi beats, vinyl crackle)
console.log('Generating Track 1: lofi_midnight_chill.wav...');
writeWavFile('lofi_midnight_chill.wav', 32000, 60, (t) => {
  const bpm = 76;
  const beat = (t * bpm) / 60;
  const bar = beat / 4;
  const beatInBar = beat % 4;

  // Chord progression (4 bars loop: Cmaj9 -> Am9 -> Dm9 -> G13)
  const chordIdx = Math.floor(bar % 4);
  const chords = [
    [130.81, 164.81, 196.00, 246.94, 293.66], // C3, E3, G3, B3, D4
    [110.00, 130.81, 164.81, 196.00, 246.94], // A2, C3, E3, G3, B3
    [146.83, 174.61, 220.00, 261.63, 329.63], // D3, F3, A3, C4, E4
    [98.00, 146.83, 174.61, 246.94, 329.63]   // G2, D3, F3, B3, E4
  ];
  const activeChord = chords[chordIdx];

  // Rhodes electric piano sound with gentle envelope per chord strike
  const chordBeat = beatInBar % 2;
  const chordEnv = Math.exp(-chordBeat * 1.8) * 0.45;
  const tremolo = 1 + 0.12 * Math.sin(2 * Math.PI * 4.5 * t);

  let keysL = 0;
  let keysR = 0;
  activeChord.forEach((f, idx) => {
    const detune = 1 + (idx - 2) * 0.0015;
    const tone = Math.sin(2 * Math.PI * f * detune * t) * 0.6 +
                 Math.sin(2 * Math.PI * f * 2 * detune * t) * 0.25 +
                 Math.sin(2 * Math.PI * f * 3 * detune * t) * 0.1;
    const pan = 0.3 + 0.4 * (idx / (activeChord.length - 1));
    keysL += tone * chordEnv * (1 - pan) * tremolo;
    keysR += tone * chordEnv * pan * tremolo;
  });

  // Warm Sub-bass
  const bassFreqs = [65.41, 55.00, 73.42, 49.00]; // C2, A1, D2, G1
  const bFreq = bassFreqs[chordIdx];
  const bassEnv = Math.min(1, Math.exp(-(beatInBar % 1) * 2.2));
  const bass = (Math.sin(2 * Math.PI * bFreq * t) * 0.5 + Math.sin(2 * Math.PI * bFreq * 2 * t) * 0.15) * bassEnv * 0.5;

  // Lofi Drums: Kick on beat 0 and 2.5
  let kick = 0;
  const kickTime1 = beatInBar % 4;
  const kickTime2 = (beatInBar - 2.5 + 4) % 4;
  const kickPhase = Math.min(kickTime1, kickTime2) * (60 / bpm);
  if (kickPhase < 0.25) {
    const kFreq = 120 * Math.exp(-kickPhase * 25) + 45;
    kick = Math.sin(2 * Math.PI * kFreq * kickPhase) * Math.exp(-kickPhase * 14) * 0.7;
  }

  // Snare on beat 1 and 3
  let snare = 0;
  const snarePhase = ((beatInBar - 1 + 4) % 2) * (60 / bpm);
  if (snarePhase < 0.28) {
    const noise = (Math.random() * 2 - 1) * 0.4;
    const tone = Math.sin(2 * Math.PI * 185 * snarePhase) * 0.4;
    snare = (noise + tone) * Math.exp(-snarePhase * 16) * 0.55;
  }

  // Hi-hat on 8th notes (every 0.5 beat) with swing
  let hat = 0;
  const hatPhase = ((beat + 0.05 * Math.sin(beat * Math.PI)) % 0.5) * (60 / bpm);
  if (hatPhase < 0.08) {
    hat = (Math.random() * 2 - 1) * Math.exp(-hatPhase * 45) * 0.12;
  }

  // Subtle vinyl crackle
  const crackle = (Math.random() < 0.008 ? (Math.random() * 2 - 1) * 0.15 : 0) + (Math.random() * 2 - 1) * 0.012;

  const totalL = keysL * 0.4 + bass * 0.5 + kick * 0.45 + snare * 0.35 + hat * 0.3 + crackle;
  const totalR = keysR * 0.4 + bass * 0.5 + kick * 0.45 + snare * 0.35 - hat * 0.3 + crackle;
  return [totalL, totalR];
});

// 2. Rainforest Mist & Ambient Chords
console.log('Generating Track 2: ambient_forest_mist.wav...');
writeWavFile('ambient_forest_mist.wav', 32000, 60, (t) => {
  // Gentle ambient progression (Emaj9 -> C#m7 -> Aadd9 -> Bsus4)
  const cycleTime = 16; // 16s per cycle
  const phase = (t % cycleTime) / cycleTime;
  const chordIdx = Math.floor(phase * 4);

  const ambientChords = [
    [164.81, 207.65, 246.94, 329.63, 493.88], // E3, G#3, B3, E4, B4
    [138.59, 164.81, 207.65, 277.18, 329.63], // C#3, E3, G#3, C#4, E4
    [110.00, 164.81, 220.00, 277.18, 329.63], // A2, E3, A3, C#4, E4
    [123.47, 164.81, 185.00, 246.94, 369.99]  // B2, E3, F#3, B3, F#4
  ];
  const curChord = ambientChords[chordIdx];

  // Drifting shimmer envelope
  const chordT = (t % 4);
  const breath = 0.7 + 0.3 * Math.sin(2 * Math.PI * (t / 8));

  let padL = 0;
  let padR = 0;
  curChord.forEach((f, idx) => {
    const lfo = Math.sin(2 * Math.PI * (0.2 + idx * 0.07) * t);
    const sine = Math.sin(2 * Math.PI * f * t + lfo * 0.5);
    const octave = Math.sin(2 * Math.PI * (f * 2) * t) * 0.25;
    const voice = (sine + octave) * (0.12 / (idx + 1));
    const pan = 0.2 + 0.6 * (idx / curChord.length);
    padL += voice * (1 - pan) * breath;
    padR += voice * pan * breath;
  });

  // Soft high bell / chime every 3 seconds
  let chime = 0;
  const chimeCycle = t % 3.2;
  if (chimeCycle < 1.8) {
    const chimeFreq = 1318.51 + Math.sin(chordIdx) * 200; // E6
    chime = Math.sin(2 * Math.PI * chimeFreq * chimeCycle) * Math.exp(-chimeCycle * 3.5) * 0.08;
  }

  // Soft filtered rain ambience
  const rainNoise = (Math.random() * 2 - 1) * 0.04;

  return [padL + chime + rainNoise, padR + chime * 0.8 + rainNoise];
});

// 3. Deep Focus Chillhop Flow
console.log('Generating Track 3: deep_focus_flow.wav...');
writeWavFile('deep_focus_flow.wav', 32000, 60, (t) => {
  const bpm = 68;
  const beat = (t * bpm) / 60;
  const bar = beat / 4;
  const beatInBar = beat % 4;

  const chordIdx = Math.floor(bar % 4);
  // Em9 -> Bm7 -> Cmaj7 -> Dadd9
  const chords = [
    [164.81, 196.00, 246.94, 293.66, 370.00],
    [123.47, 146.83, 185.00, 220.00, 293.66],
    [130.81, 164.81, 196.00, 246.94, 329.63],
    [146.83, 185.00, 220.00, 293.66, 370.00]
  ];
  const notes = chords[chordIdx];
  const pulse = Math.exp(-(beatInBar % 1) * 2.5) * 0.4 + 0.1;

  let synthL = 0;
  let synthR = 0;
  notes.forEach((f, idx) => {
    const vib = 1 + 0.003 * Math.sin(2 * Math.PI * 5 * t);
    const val = (Math.sin(2 * Math.PI * f * vib * t) + 0.3 * Math.sin(2 * Math.PI * f * 3 * t)) * (0.15 / (idx + 1));
    synthL += val * pulse;
    synthR += val * pulse;
  });

  // Soft kick and brush
  let beatPulse = 0;
  const kP = (beatInBar % 2) * (60 / bpm);
  if (kP < 0.2) {
    beatPulse = Math.sin(2 * Math.PI * 65 * kP) * Math.exp(-kP * 18) * 0.5;
  }
  const brushP = ((beatInBar - 1 + 4) % 2) * (60 / bpm);
  let brush = 0;
  if (brushP < 0.15) {
    brush = (Math.random() * 2 - 1) * Math.exp(-brushP * 25) * 0.15;
  }

  return [synthL * 0.6 + beatPulse + brush, synthR * 0.6 + beatPulse - brush];
});

console.log('All audio files generated successfully!');
