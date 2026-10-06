import { Buffer } from 'buffer';

export interface DtwResult {
  isMatch: boolean;
  targetSimilarity: number;
  targetNumber: number;
  targetWord: string;
  bestNumber: number;
  bestWord: string;
  bestSimilarity: number;
  distance: number;
  numFrames: number;
}

// Load precomputed MFCC templates (0-99)
const templatesData: Record<string, { word: string; frames: number; mfcc: number[][] }> =
  require('../assets/marathi_dtw_templates.json');

const SAMPLE_RATE = 16000;
const FFT_SIZE = 512;
const WIN_SIZE = 400; // 25ms
const HOP_SIZE = 160; // 10ms
const NUM_FILTERS = 26;
const NUM_COEFFS = 13;
const PRE_EMPHASIS = 0.97;
const HALF_FFT = FFT_SIZE / 2 + 1;

// Precompute Hamming window
const hamming = new Float32Array(WIN_SIZE);
for (let i = 0; i < WIN_SIZE; i++) {
  hamming[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN_SIZE - 1));
}

// Mel scale conversion functions
const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

// Precompute Mel filterbank
const minMel = hzToMel(0);
const maxMel = hzToMel(SAMPLE_RATE / 2);
const melPoints = new Float32Array(NUM_FILTERS + 2);
for (let i = 0; i < NUM_FILTERS + 2; i++) {
  melPoints[i] = minMel + (i * (maxMel - minMel)) / (NUM_FILTERS + 1);
}
const hzPoints = new Float32Array(NUM_FILTERS + 2);
const binPoints = new Int32Array(NUM_FILTERS + 2);
for (let i = 0; i < NUM_FILTERS + 2; i++) {
  hzPoints[i] = melToHz(melPoints[i]);
  binPoints[i] = Math.floor(((FFT_SIZE + 1) * hzPoints[i]) / SAMPLE_RATE);
}

const filterbank: Float32Array[] = [];
for (let m = 1; m <= NUM_FILTERS; m++) {
  const f = new Float32Array(HALF_FFT);
  const left = binPoints[m - 1];
  const center = binPoints[m];
  const right = binPoints[m + 1];

  for (let k = left; k < center; k++) {
    if (center !== left) f[k] = (k - left) / (center - left);
  }
  for (let k = center; k < right; k++) {
    if (right !== center) f[k] = (right - k) / (right - center);
  }
  filterbank.push(f);
}

// Precompute DCT matrix (Type-II)
const dct: Float32Array[] = [];
for (let i = 0; i < NUM_COEFFS; i++) {
  const row = new Float32Array(NUM_FILTERS);
  const factor = Math.PI / NUM_FILTERS;
  for (let j = 0; j < NUM_FILTERS; j++) {
    row[j] = Math.cos(i * (j + 0.5) * factor);
  }
  dct.push(row);
}

// Radix-2 Cooley-Tukey FFT
function fft(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let l = 2; l <= n; l <<= 1) {
    const halfL = l >> 1;
    const angle = (-2 * Math.PI) / l;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += l) {
      let wr = 1;
      let wi = 0;
      for (let m = 0; m < halfL; m++) {
        const pos = i + m;
        const match = pos + halfL;
        const tr = wr * real[match] - wi * imag[match];
        const ti = wr * imag[match] + wi * real[match];
        real[match] = real[pos] - tr;
        imag[match] = imag[pos] - ti;
        real[pos] += tr;
        imag[pos] += ti;
        const nextWr = wr * wStepR - wi * wStepI;
        wi = wr * wStepI + wi * wStepR;
        wr = nextWr;
      }
    }
  }
}

/**
 * Convert base64 PCM chunks from LiveAudioStream into a Float32Array normalized [-1.0, 1.0]
 */
export function pcmChunksToFloat32(base64Chunks: string[]): Float32Array {
  const buffers = base64Chunks.map(b64 => Buffer.from(b64, 'base64'));
  const totalBytes = buffers.reduce((sum, b) => sum + b.length, 0);
  const totalSamples = Math.floor(totalBytes / 2);
  const result = new Float32Array(totalSamples);
  let sampleIdx = 0;
  for (const buf of buffers) {
    for (let i = 0; i + 1 < buf.length; i += 2) {
      const int16 = buf.readInt16LE(i);
      result[sampleIdx++] = int16 / 32768.0;
    }
  }
  return result;
}

/**
 * Trim leading and trailing silence using RMS energy detection (VAD)
 */
export function trimSilence(pcm: Float32Array, thresholdRms: number = 0.015): Float32Array {
  const frameLength = 320; // 20ms frames
  const numFrames = Math.floor(pcm.length / frameLength);
  if (numFrames < 5) return pcm;

  let startFrame = 0;
  let endFrame = numFrames - 1;

  // Find start of speech
  for (let f = 0; f < numFrames; f++) {
    let sumSquares = 0;
    const offset = f * frameLength;
    for (let i = 0; i < frameLength; i++) {
      const s = pcm[offset + i];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / frameLength);
    if (rms >= thresholdRms) {
      startFrame = Math.max(0, f - 2); // 40ms safety lead
      break;
    }
  }

  // Find end of speech
  for (let f = numFrames - 1; f >= 0; f--) {
    let sumSquares = 0;
    const offset = f * frameLength;
    for (let i = 0; i < frameLength; i++) {
      const s = pcm[offset + i];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / frameLength);
    if (rms >= thresholdRms) {
      endFrame = Math.min(numFrames - 1, f + 2); // 40ms safety tail
      break;
    }
  }

  if (startFrame >= endFrame) return pcm;

  const startSample = startFrame * frameLength;
  const endSample = Math.min(pcm.length, (endFrame + 1) * frameLength);
  return pcm.slice(startSample, endSample);
}

/**
 * Extract 13 MFCC coefficients per frame with CMVN normalization
 */
export function extractMfcc(pcmSamples: Float32Array): number[][] {
  if (pcmSamples.length < WIN_SIZE) return [];

  // Pre-emphasis
  const emphasized = new Float32Array(pcmSamples.length);
  emphasized[0] = pcmSamples[0];
  for (let i = 1; i < pcmSamples.length; i++) {
    emphasized[i] = pcmSamples[i] - PRE_EMPHASIS * pcmSamples[i - 1];
  }

  const numFrames = Math.floor((emphasized.length - WIN_SIZE) / HOP_SIZE) + 1;
  const mfccFrames: number[][] = [];

  const real = new Float32Array(FFT_SIZE);
  const imag = new Float32Array(FFT_SIZE);
  const power = new Float32Array(HALF_FFT);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * HOP_SIZE;

    real.fill(0);
    imag.fill(0);
    for (let i = 0; i < WIN_SIZE; i++) {
      real[i] = emphasized[offset + i] * hamming[i];
    }

    fft(real, imag);

    for (let k = 0; k < HALF_FFT; k++) {
      power[k] = (real[k] * real[k] + imag[k] * imag[k]) / FFT_SIZE;
    }

    const logEnergies = new Float32Array(NUM_FILTERS);
    for (let m = 0; m < NUM_FILTERS; m++) {
      let sum = 0;
      const fb = filterbank[m];
      for (let k = 0; k < HALF_FFT; k++) {
        sum += power[k] * fb[k];
      }
      logEnergies[m] = Math.log(Math.max(sum, 1e-6));
    }

    const mfcc = new Array(NUM_COEFFS);
    for (let i = 0; i < NUM_COEFFS; i++) {
      let sum = 0;
      const row = dct[i];
      for (let j = 0; j < NUM_FILTERS; j++) {
        sum += logEnergies[j] * row[j];
      }
      mfcc[i] = sum;
    }

    mfccFrames.push(mfcc);
  }

  // Cepstral Mean and Variance Normalization (CMVN)
  if (mfccFrames.length > 1) {
    for (let c = 0; c < NUM_COEFFS; c++) {
      let mean = 0;
      for (let i = 0; i < mfccFrames.length; i++) mean += mfccFrames[i][c];
      mean /= mfccFrames.length;

      let variance = 0;
      for (let i = 0; i < mfccFrames.length; i++) {
        const diff = mfccFrames[i][c] - mean;
        variance += diff * diff;
      }
      const std = Math.sqrt(variance / mfccFrames.length) + 1e-8;

      for (let i = 0; i < mfccFrames.length; i++) {
        mfccFrames[i][c] = (mfccFrames[i][c] - mean) / std;
      }
    }
  }

  return mfccFrames;
}

/**
 * Compute Dynamic Time Warping (DTW) distance between two MFCC sequences
 */
export function dtwDistance(seq1: number[][], seq2: number[][]): number {
  const n = seq1.length;
  const m = seq2.length;
  if (n === 0 || m === 0) return 999;

  // Fast euclidean distance between 13-dim vectors
  const dist = (v1: number[], v2: number[]) => {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const d = v1[i] - v2[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  };

  // DP matrix
  const dp: Float32Array[] = [];
  for (let i = 0; i <= n; i++) {
    const row = new Float32Array(m + 1);
    row.fill(Infinity);
    dp.push(row);
  }
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = dist(seq1[i - 1], seq2[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / (n + m);
}

/**
 * Convert DTW distance into a similarity percentage (0% to 100%)
 */
export function distanceToSimilarity(dist: number): number {
  if (dist <= 0) return 100;
  // Normalized distance typically falls between 0.0 (identical) and 2.6 (different word)
  const sim = (1 - dist / 2.6) * 100;
  return Math.max(0, Math.min(100, Math.round(sim)));
}

/**
 * Evaluate spoken answer using Option 1: Acoustic DTW Matching
 * Compares directly against the target number's clean reference template,
 * and also finds the best overall acoustic candidate among 0-99.
 */
export function evaluateSpokenAnswer(
  rawPcm: Float32Array,
  targetNumber: number
): DtwResult | null {
  const trimmed = trimSilence(rawPcm);
  if (trimmed.length < WIN_SIZE * 2) {
    return null; // Not enough audio / empty recording
  }

  const userMfcc = extractMfcc(trimmed);
  if (userMfcc.length < 5) {
    return null; // Less than 50ms of audio
  }

  const targetKey = String(targetNumber);
  const targetTemplate = templatesData[targetKey];
  const targetWord = targetTemplate ? targetTemplate.word : String(targetNumber);

  // 1. Calculate DTW distance to expected target number
  let targetDist = 999;
  if (targetTemplate && targetTemplate.mfcc) {
    targetDist = dtwDistance(userMfcc, targetTemplate.mfcc);
  }
  const targetSimilarity = distanceToSimilarity(targetDist);

  // 2. Search for best overall acoustic candidate among all 100 templates
  let bestNumber = targetNumber;
  let bestDist = targetDist;
  let bestWord = targetWord;

  for (const [key, t] of Object.entries(templatesData)) {
    const num = parseInt(key, 10);
    if (num === targetNumber) continue;

    // Fast length filter: if frame length differs by > 3.5x, skip heavy DTW
    const lenRatio = userMfcc.length / (t.frames || 1);
    if (lenRatio < 0.28 || lenRatio > 3.5) continue;

    const d = dtwDistance(userMfcc, t.mfcc);
    if (d < bestDist) {
      bestDist = d;
      bestNumber = num;
      bestWord = t.word;
    }
  }

  const bestSimilarity = distanceToSimilarity(bestDist);

  // 3. Match criterion:
  // - Acoustic similarity >= 70% to target, OR
  // - Target is best candidate with >= 60% similarity
  const isMatch = targetSimilarity >= 70 || (bestNumber === targetNumber && targetSimilarity >= 60);

  return {
    isMatch,
    targetSimilarity,
    targetNumber,
    targetWord,
    bestNumber,
    bestWord,
    bestSimilarity,
    distance: Math.round(targetDist * 100) / 100,
    numFrames: userMfcc.length,
  };
}
