export const NOTE_STEPS = [0, 2, 4, 5, 7];
export const NOTE_NAMES = ["DO", "RE", "MI", "FA", "SO"];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export const centsBetween = (frequency, reference) => 1200 * Math.log2(frequency / reference);

// YIN's cumulative mean normalized difference finds the first periodic valley,
// avoiding the octave ambiguity of selecting the largest correlation peak.
// Downsampling bounds the work at 25 analyses/second on phone microphones.
export function detectPitch(samples, sampleRate, { minHz = 70, maxHz = 1000, minRms = 0.012 } = {}) {
  if (!(sampleRate > 0) || samples.length < 512) return null;
  const stride = Math.max(1, Math.floor(sampleRate / 22050));
  const size = Math.floor(samples.length / stride);
  const signal = new Float32Array(size);
  let mean = 0;
  for (let i = 0; i < size; i += 1) {
    let sum = 0;
    for (let j = 0; j < stride; j += 1) sum += samples[i * stride + j];
    signal[i] = sum / stride;
    mean += signal[i];
  }
  mean /= size;
  let energy = 0;
  for (let i = 0; i < size; i += 1) {
    signal[i] -= mean;
    energy += signal[i] ** 2;
  }
  const rms = Math.sqrt(energy / size);
  if (rms < minRms) return null;
  const rate = sampleRate / stride;
  const maxLag = Math.min(Math.ceil(rate / minHz), Math.floor(size / 2) - 1);
  const minLag = Math.max(2, Math.floor(rate / maxHz));
  const windowSize = size - maxLag;
  const difference = new Float32Array(maxLag + 1);
  difference[0] = 1;
  let cumulative = 0;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < windowSize; i += 1) sum += (signal[i] - signal[i + lag]) ** 2;
    cumulative += sum;
    difference[lag] = cumulative > 0 ? sum * lag / cumulative : 1;
  }
  let lag = minLag;
  while (lag < maxLag) {
    if (difference[lag] < 0.15) {
      while (lag + 1 <= maxLag && difference[lag + 1] < difference[lag]) lag += 1;
      break;
    }
    lag += 1;
  }
  if (lag >= maxLag || difference[lag] > 0.15) return null;
  const a = difference[lag - 1];
  const b = difference[lag];
  const c = difference[lag + 1];
  const denominator = 2 * (2 * b - a - c);
  const refined = lag + (denominator ? (c - a) / denominator : 0);
  const frequency = rate / refined;
  if (frequency < minHz || frequency > maxHz) return null;
  return { frequency, rms, confidence: 1 - b };
}

export function classifyNote(frequency, reference, previousLane = null) {
  if (!(frequency > 0) || !(reference > 0)) return null;
  const semitones = centsBetween(frequency, reference) / 100;
  let lane = NOTE_STEPS.reduce((best, step, index) =>
    Math.abs(semitones - step) < Math.abs(semitones - NOTE_STEPS[best]) ? index : best, 0);
  // Retain the previous lane around a midpoint, without widening its hit grade.
  if (previousLane !== null && Math.abs(semitones - NOTE_STEPS[previousLane]) <
      Math.abs(semitones - NOTE_STEPS[lane]) + 0.15) lane = previousLane;
  const cents = (semitones - NOTE_STEPS[lane]) * 100;
  return { lane, cents, semitones, grade: Math.abs(cents) <= 30 ? "PERFECT" : Math.abs(cents) <= 75 ? "GOOD" : "MISS" };
}

export class PitchTracker {
  constructor() { this.reset(); }
  reset() {
    this.reference = null;
    this.calibrating = false;
    this.calibration = [];
    this.samples = [];
    this.previousLane = null;
    this.progress = 0;
    this.lastAt = null;
  }
  beginCalibration() { this.reset(); this.calibrating = true; }
  clearSignal() { this.samples = []; this.previousLane = null; this.lastAt = null; }
  update(pitch, timestamp) {
    if (!pitch || pitch.confidence < 0.85) {
      this.clearSignal();
      if (this.calibrating) { this.calibration = []; this.progress = 0; }
      return { voiced: false, frequency: null, note: null, progress: this.progress, reference: this.reference };
    }
    if (this.lastAt !== null && (timestamp - this.lastAt > 160 || timestamp < this.lastAt)) {
      this.clearSignal();
      if (this.calibrating) { this.calibration = []; this.progress = 0; }
    }
    this.lastAt = timestamp;
    if (this.calibrating) {
      if (this.calibration.length && Math.abs(centsBetween(pitch.frequency, median(this.calibration.map((s) => s.frequency)))) > 65) {
        this.calibration = [];
      }
      this.calibration.push({ frequency: pitch.frequency, timestamp });
      this.progress = Math.min(1, (timestamp - this.calibration[0].timestamp) / 1000, this.calibration.length / 20);
      if (this.progress >= 1) {
        this.reference = median(this.calibration.map((s) => s.frequency));
        this.calibrating = false;
      }
    }
    this.samples = this.samples.filter((s) => timestamp - s.timestamp <= 120);
    this.samples.push({ frequency: pitch.frequency, timestamp });
    const frequency = median(this.samples.map((s) => s.frequency));
    const note = this.reference ? classifyNote(frequency, this.reference, this.previousLane) : null;
    if (note?.grade !== "MISS" && note) this.previousLane = note.lane;
    return { voiced: true, frequency, note, progress: this.progress, reference: this.reference, rms: pitch.rms };
  }
}
