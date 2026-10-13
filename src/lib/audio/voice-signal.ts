import type { VoiceConfig } from './voice-config';

/*
 * From what a microphone recorded to the clip that is published: samples in, bytes of a WAV file
 * out. No browser API here: decoding the recording is done by the page, and all the rest can be
 * checked in Node.
 */

export interface SilenceOptions {
	readonly frameMs: number;
	readonly ratio: number;
	readonly paddingMs: number;
}

export interface WavHeader {
	readonly sampleRate: number;
	readonly channels: number;
	readonly bitsPerSample: number;
	readonly sampleCount: number;
	readonly durationMs: number;
}

export interface ProcessedTake {
	/** A complete WAV file: PCM, 16 bits, mono. */
	readonly wav: Uint8Array<ArrayBuffer>;
	readonly durationMs: number;
}

const MS_PER_SECOND = 1000;
/** Half-width of the resampling filter, in periods of its cutoff: more is sharper and slower. */
const RESAMPLE_ZERO_CROSSINGS = 16;

const WAV_HEADER_BYTES = 44;
const WAV_FORMAT_BYTES = 16;
const WAV_PCM = 1;
const WAV_CHANNELS = 1;
const WAV_BITS = 16;
const WAV_BYTES_PER_SAMPLE = WAV_BITS / 8;
const INT16_MAX = 32767;

function samplesIn(milliseconds: number, sampleRate: number): number {
	return Math.round((milliseconds * sampleRate) / MS_PER_SECOND);
}

function peakOf(samples: Float32Array): number {
	let peak = 0;
	for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
	return peak;
}

export function mixToMono(channels: readonly Float32Array[]): Float32Array<ArrayBuffer> {
	const length = channels.reduce(
		(shortest, channel) => Math.min(shortest, channel.length),
		Infinity
	);
	const mono = new Float32Array(Number.isFinite(length) ? length : 0);
	for (const channel of channels) {
		for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) + (channel[i] ?? 0);
	}
	for (let i = 0; i < mono.length; i++) mono[i] = (mono[i] ?? 0) / channels.length;
	return mono;
}

function windowedSinc(distance: number, halfWidth: number, cutoff: number): number {
	if (distance === 0) return 1;
	const phase = Math.PI * distance * cutoff;
	const hann = 0.5 * (1 + Math.cos((Math.PI * distance) / halfWidth));
	return (Math.sin(phase) / phase) * hann;
}

/**
 * Band-limited resampling (sinc filter under a Hann window). Lowering the rate first removes what
 * the new rate cannot carry: dropping samples without it turns hisses into audible false notes.
 */
export function resample(
	samples: Float32Array,
	fromRate: number,
	toRate: number
): Float32Array<ArrayBuffer> {
	if (fromRate === toRate) return Float32Array.from(samples);
	const cutoff = Math.min(1, toRate / fromRate);
	const halfWidth = RESAMPLE_ZERO_CROSSINGS / cutoff;
	const resampled = new Float32Array(Math.floor((samples.length * toRate) / fromRate));
	for (let i = 0; i < resampled.length; i++) {
		const center = (i * fromRate) / toRate;
		const first = Math.max(0, Math.ceil(center - halfWidth));
		const last = Math.min(samples.length - 1, Math.floor(center + halfWidth));
		let sum = 0;
		let weights = 0;
		for (let j = first; j <= last; j++) {
			const weight = windowedSinc(j - center, halfWidth, cutoff);
			sum += (samples[j] ?? 0) * weight;
			weights += weight;
		}
		resampled[i] = weights === 0 ? 0 : sum / weights;
	}
	return resampled;
}

/**
 * Cuts what comes before the first and after the last slice of speech. Loudness is measured by
 * slice and against the loudest one, so that neither the level of the microphone nor one stray
 * sample decides where the speech starts.
 */
export function trimSilence(
	samples: Float32Array,
	sampleRate: number,
	options: SilenceOptions
): Float32Array<ArrayBuffer> {
	const frame = Math.max(1, samplesIn(options.frameMs, sampleRate));
	const levels: number[] = [];
	for (let start = 0; start < samples.length; start += frame) {
		const slice = samples.subarray(start, start + frame);
		let squares = 0;
		for (const sample of slice) squares += sample * sample;
		levels.push(Math.sqrt(squares / slice.length));
	}
	const loudest = Math.max(0, ...levels);
	if (loudest === 0) return new Float32Array(0);

	const isSpeech = (level: number) => level >= loudest * options.ratio;
	const padding = samplesIn(options.paddingMs, sampleRate);
	const start = Math.max(0, levels.findIndex(isSpeech) * frame - padding);
	const end = Math.min(samples.length, (levels.findLastIndex(isSpeech) + 1) * frame + padding);
	return Float32Array.from(samples.subarray(start, end));
}

export function normalizePeak(
	samples: Float32Array,
	targetPeak: number
): Float32Array<ArrayBuffer> {
	const peak = peakOf(samples);
	const gain = peak === 0 ? 1 : targetPeak / peak;
	return Float32Array.from(samples, (sample) => sample * gain);
}

/** A linear fade from and to silence, which hides the cut at both ends. */
export function fadeEdges(
	samples: Float32Array,
	sampleRate: number,
	fadeMs: number
): Float32Array<ArrayBuffer> {
	const fade = samplesIn(fadeMs, sampleRate);
	if (fade === 0) return Float32Array.from(samples);
	const lastIndex = samples.length - 1;
	return Float32Array.from(
		samples,
		(sample, i) => sample * Math.min(1, i / fade, (lastIndex - i) / fade)
	);
}

function writeAscii(view: DataView, offset: number, text: string) {
	for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
	return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** A WAV file with the canonical 44-byte header: PCM, 16 bits, mono. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> {
	const dataBytes = samples.length * WAV_BYTES_PER_SAMPLE;
	const bytes = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
	const view = new DataView(bytes.buffer);
	const blockAlign = WAV_CHANNELS * WAV_BYTES_PER_SAMPLE;
	writeAscii(view, 0, 'RIFF');
	view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
	writeAscii(view, 8, 'WAVE');
	writeAscii(view, 12, 'fmt ');
	view.setUint32(16, WAV_FORMAT_BYTES, true);
	view.setUint16(20, WAV_PCM, true);
	view.setUint16(22, WAV_CHANNELS, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * blockAlign, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, WAV_BITS, true);
	writeAscii(view, 36, 'data');
	view.setUint32(40, dataBytes, true);
	samples.forEach((sample, i) => {
		const clipped = Number.isNaN(sample) ? 0 : Math.max(-1, Math.min(1, sample));
		view.setInt16(
			WAV_HEADER_BYTES + i * WAV_BYTES_PER_SAMPLE,
			Math.round(clipped * INT16_MAX),
			true
		);
	});
	return bytes;
}

/** Reads the header written by `encodeWav`, and refuses any other kind of WAV file. */
export function readWavHeader(bytes: Uint8Array): WavHeader {
	const refuse = (reason: string): never => {
		throw new Error(`WAV: ${reason}`);
	};
	if (bytes.length < WAV_HEADER_BYTES) refuse('the file is shorter than a header');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WAVE') {
		refuse('not a RIFF/WAVE file');
	}
	if (readAscii(bytes, 12, 4) !== 'fmt ' || readAscii(bytes, 36, 4) !== 'data') {
		refuse('expected the format block then the samples, and nothing else');
	}
	if (view.getUint16(20, true) !== WAV_PCM) refuse('expected PCM samples');
	const channels = view.getUint16(22, true);
	if (channels !== WAV_CHANNELS) refuse(`expected one channel, found ${channels}`);
	const bitsPerSample = view.getUint16(34, true);
	if (bitsPerSample !== WAV_BITS) refuse(`expected 16 bits per sample, found ${bitsPerSample}`);
	const sampleRate = view.getUint32(24, true);
	if (sampleRate === 0) refuse('expected a sample rate');
	const dataBytes = view.getUint32(40, true);
	if (dataBytes !== bytes.length - WAV_HEADER_BYTES) {
		refuse('the samples do not fill the file exactly');
	}
	const sampleCount = dataBytes / WAV_BYTES_PER_SAMPLE;
	return {
		sampleRate,
		channels,
		bitsPerSample,
		sampleCount,
		durationMs: Math.round((sampleCount * MS_PER_SECOND) / sampleRate)
	};
}

/** `null` when nothing was heard: there is no clip to keep. */
export function processTake(
	channels: readonly Float32Array[],
	sampleRate: number,
	config: VoiceConfig
): ProcessedTake | null {
	const mono = resample(mixToMono(channels), sampleRate, config.sampleRate);
	if (peakOf(mono) < config.minPeak) return null;
	const speech = trimSilence(mono, config.sampleRate, {
		frameMs: config.silenceFrameMs,
		ratio: config.silenceRatio,
		paddingMs: config.silencePaddingMs
	});
	const leveled = normalizePeak(speech, config.targetPeak);
	const wav = encodeWav(fadeEdges(leveled, config.sampleRate, config.fadeMs), config.sampleRate);
	return { wav, durationMs: readWavHeader(wav).durationMs };
}
