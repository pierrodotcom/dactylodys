import { describe, expect, it } from 'vitest';
import type { VoiceConfig } from './voice-config';
import {
	encodeWav,
	fadeEdges,
	mixToMono,
	normalizePeak,
	processTake,
	readWavHeader,
	resample,
	trimSilence
} from './voice-signal';

const CONFIG: VoiceConfig = {
	sampleRate: 22050,
	maxTakeSeconds: 60,
	silenceFrameMs: 20,
	silenceRatio: 0.05,
	silencePaddingMs: 100,
	minPeak: 0.02,
	targetPeak: 0.9,
	fadeMs: 10,
	mp3BitrateKbps: 64
};
const TRIM = { frameMs: 20, ratio: 0.05, paddingMs: 100 };

function tone(frequency: number, seconds: number, sampleRate: number, amplitude = 0.5) {
	const samples = new Float32Array(Math.round(seconds * sampleRate));
	for (let i = 0; i < samples.length; i++) {
		samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
	}
	return samples;
}

function silence(seconds: number, sampleRate: number, level = 0) {
	const samples = new Float32Array(Math.round(seconds * sampleRate));
	// A deterministic hiss: alternating signs at a constant level.
	for (let i = 0; i < samples.length; i++) samples[i] = i % 2 === 0 ? level : -level;
	return samples;
}

function join(...parts: Float32Array[]): Float32Array {
	const joined = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
	let offset = 0;
	for (const part of parts) {
		joined.set(part, offset);
		offset += part.length;
	}
	return joined;
}

function peak(samples: Float32Array): number {
	return samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
}

/** Peak of the middle half: away from the edges, where a filter has less to work with. */
function innerPeak(samples: Float32Array): number {
	return peak(
		samples.subarray(Math.floor(samples.length / 4), Math.ceil((samples.length * 3) / 4))
	);
}

function risingCrossings(samples: Float32Array): number {
	let count = 0;
	for (let i = 1; i < samples.length; i++) {
		if ((samples[i - 1] ?? 0) < 0 && (samples[i] ?? 0) >= 0) count += 1;
	}
	return count;
}

function int16At(bytes: Uint8Array, offset: number): number {
	return new DataView(bytes.buffer, bytes.byteOffset).getInt16(offset, true);
}

describe('mixToMono', () => {
	it('averages the channels sample by sample', () => {
		const mono = mixToMono([new Float32Array([1, 0, -0.5]), new Float32Array([0, 0.5, -0.5])]);

		expect(Array.from(mono)).toEqual([0.5, 0.25, -0.5]);
	});

	it('copies a single channel without touching the original', () => {
		const channel = new Float32Array([0.1, 0.2]);

		const mono = mixToMono([channel]);
		mono[0] = 1;

		expect(channel[0]).toBeCloseTo(0.1);
	});

	it('gives nothing without any channel', () => {
		expect(mixToMono([])).toHaveLength(0);
	});
});

describe('resample', () => {
	it('gives back the same samples at the same rate', () => {
		const samples = tone(440, 0.1, 22050);

		expect(Array.from(resample(samples, 22050, 22050))).toEqual(Array.from(samples));
	});

	it('scales the length by the ratio of the rates', () => {
		expect(resample(new Float32Array(48000), 48000, 22050)).toHaveLength(22050);
		expect(resample(new Float32Array(44100), 44100, 22050)).toHaveLength(22050);
		expect(resample(new Float32Array(8000), 8000, 22050)).toHaveLength(22050);
	});

	it('keeps a constant level constant, edges included', () => {
		const flat = new Float32Array(4800).fill(0.25);

		for (const sample of resample(flat, 48000, 22050)) expect(sample).toBeCloseTo(0.25, 5);
	});

	it('keeps the pitch and the loudness of a voice-range tone', () => {
		const resampled = resample(tone(440, 1, 48000), 48000, 22050);

		expect(risingCrossings(resampled)).toBeGreaterThanOrEqual(439);
		expect(risingCrossings(resampled)).toBeLessThanOrEqual(441);
		expect(innerPeak(resampled)).toBeCloseTo(0.5, 2);
	});

	it('removes what the lower rate cannot carry instead of folding it back as noise', () => {
		const resampled = resample(tone(15000, 0.5, 48000), 48000, 22050);

		expect(innerPeak(resampled)).toBeLessThan(0.01);
	});

	it('raises the rate without changing the tone', () => {
		const resampled = resample(tone(440, 1, 16000), 16000, 22050);

		expect(risingCrossings(resampled)).toBeGreaterThanOrEqual(439);
		expect(risingCrossings(resampled)).toBeLessThanOrEqual(441);
		expect(innerPeak(resampled)).toBeCloseTo(0.5, 2);
	});
});

describe('trimSilence', () => {
	const RATE = 22050;
	/** One second of tone and 100 ms of padding on each side. */
	const SPEECH_AND_PADDING = Math.round(1.2 * RATE);
	const TWO_FRAMES = Math.round(0.04 * RATE);

	it('cuts the silence before and after, keeping the padding', () => {
		const samples = join(silence(0.5, RATE), tone(440, 1, RATE), silence(0.7, RATE));

		const trimmed = trimSilence(samples, RATE, TRIM);

		expect(trimmed.length).toBeGreaterThanOrEqual(SPEECH_AND_PADDING);
		expect(trimmed.length).toBeLessThanOrEqual(SPEECH_AND_PADDING + TWO_FRAMES);
	});

	it('keeps the speech whole: what is cut never is above the silence level', () => {
		const samples = join(silence(0.5, RATE), tone(440, 1, RATE), silence(0.7, RATE));

		const trimmed = trimSilence(samples, RATE, TRIM);

		const energy = (part: Float32Array) => part.reduce((sum, sample) => sum + sample * sample, 0);
		expect(energy(trimmed)).toBeCloseTo(energy(samples), 3);
	});

	it('treats a hiss far quieter than the voice as silence', () => {
		const samples = join(silence(0.5, RATE, 0.004), tone(440, 1, RATE), silence(0.5, RATE, 0.004));

		const trimmed = trimSilence(samples, RATE, TRIM);

		expect(trimmed.length).toBeLessThanOrEqual(SPEECH_AND_PADDING + TWO_FRAMES);
	});

	it('keeps a pause in the middle of the speech', () => {
		const samples = join(tone(440, 0.3, RATE), silence(0.6, RATE), tone(440, 0.3, RATE));

		expect(trimSilence(samples, RATE, TRIM)).toHaveLength(samples.length);
	});

	it('never reaches outside the take when the speech touches its edges', () => {
		const samples = tone(440, 0.5, RATE);

		expect(trimSilence(samples, RATE, TRIM)).toHaveLength(samples.length);
	});

	it('gives nothing for pure silence', () => {
		expect(trimSilence(new Float32Array(RATE), RATE, TRIM)).toHaveLength(0);
		expect(trimSilence(new Float32Array(0), RATE, TRIM)).toHaveLength(0);
	});
});

describe('normalizePeak', () => {
	it('brings the loudest sample to the target, quiet or loud', () => {
		expect(peak(normalizePeak(new Float32Array([0.1, -0.2, 0.05]), 0.9))).toBeCloseTo(0.9);
		expect(peak(normalizePeak(new Float32Array([0.1, -1, 0.5]), 0.9))).toBeCloseTo(0.9);
	});

	it('keeps the proportions between samples', () => {
		const leveled = normalizePeak(new Float32Array([0.1, -0.2]), 0.9);

		expect((leveled[0] ?? 0) / (leveled[1] ?? 1)).toBeCloseTo(-0.5);
	});

	it('leaves pure silence as it is', () => {
		expect(Array.from(normalizePeak(new Float32Array(3), 0.9))).toEqual([0, 0, 0]);
	});
});

describe('fadeEdges', () => {
	it('starts and ends at zero and leaves the middle untouched', () => {
		const faded = fadeEdges(new Float32Array(1000).fill(0.5), 1000, 100);

		expect(faded[0]).toBe(0);
		expect(faded[999]).toBe(0);
		expect(faded[50]).toBeCloseTo(0.25, 2);
		expect(faded[100]).toBeCloseTo(0.5);
		expect(faded[500]).toBeCloseTo(0.5);
		expect(faded[899]).toBeCloseTo(0.5);
	});

	it('copes with a take shorter than two fades', () => {
		const faded = fadeEdges(new Float32Array(10).fill(0.5), 1000, 100);

		expect(faded[0]).toBe(0);
		expect(faded[9]).toBe(0);
		expect(peak(faded)).toBeLessThanOrEqual(0.5);
	});
});

describe('encodeWav', () => {
	it('writes the exact header of a 16-bit mono PCM file, then the samples', () => {
		const bytes = encodeWav(new Float32Array([0, 0.5, -1]), 22050);

		// prettier-ignore
		expect(Array.from(bytes)).toEqual([
			0x52, 0x49, 0x46, 0x46, // "RIFF"
			42, 0, 0, 0,            // size of what follows: 36 + 6 bytes of samples
			0x57, 0x41, 0x56, 0x45, // "WAVE"
			0x66, 0x6d, 0x74, 0x20, // "fmt "
			16, 0, 0, 0,            // size of the format block
			1, 0,                   // PCM
			1, 0,                   // one channel
			0x22, 0x56, 0, 0,       // 22050 samples per second
			0x44, 0xac, 0, 0,       // 44100 bytes per second
			2, 0,                   // bytes per sample frame
			16, 0,                  // bits per sample
			0x64, 0x61, 0x74, 0x61, // "data"
			6, 0, 0, 0,             // bytes of samples
			0, 0,                   // 0
			0x00, 0x40,             // 0.5 → 16384
			0x01, 0x80              // -1 → -32767
		]);
	});

	it('clips samples beyond full scale instead of wrapping around', () => {
		const bytes = encodeWav(new Float32Array([2, -2, Number.NaN]), 22050);

		expect(int16At(bytes, 44)).toBe(32767);
		expect(int16At(bytes, 46)).toBe(-32767);
		expect(int16At(bytes, 48)).toBe(0);
	});
});

describe('readWavHeader', () => {
	it('reads back what encodeWav wrote', () => {
		const bytes = encodeWav(new Float32Array(11025), 22050);

		expect(readWavHeader(bytes)).toEqual({
			sampleRate: 22050,
			channels: 1,
			bitsPerSample: 16,
			sampleCount: 11025,
			durationMs: 500
		});
	});

	it.each([
		['too short', () => new Uint8Array(20)],
		[
			'not a RIFF file',
			() => {
				const bytes = encodeWav(new Float32Array(4), 22050);
				bytes[0] = 0x4f;
				return bytes;
			}
		],
		[
			'in stereo',
			() => {
				const bytes = encodeWav(new Float32Array(4), 22050);
				bytes[22] = 2;
				return bytes;
			}
		],
		[
			'not 16 bits',
			() => {
				const bytes = encodeWav(new Float32Array(4), 22050);
				bytes[34] = 8;
				return bytes;
			}
		],
		['cut before the end of its samples', () => encodeWav(new Float32Array(4), 22050).slice(0, 48)]
	])('refuses a file that is %s', (_, build) => {
		expect(() => readWavHeader(build())).toThrow(/^WAV: /);
	});
});

describe('processTake', () => {
	function stereoTake() {
		const left = join(silence(0.4, 48000), tone(300, 1, 48000, 0.2), silence(0.6, 48000));
		const right = join(silence(0.4, 48000), tone(300, 1, 48000, 0.1), silence(0.6, 48000));
		return [left, right];
	}

	it('turns a stereo take into a trimmed, leveled, mono WAV at the configured rate', () => {
		const take = processTake(stereoTake(), 48000, CONFIG);

		expect(take).not.toBeNull();
		const header = readWavHeader(take!.wav);
		expect(header).toMatchObject({ sampleRate: 22050, channels: 1, bitsPerSample: 16 });
		expect(take!.durationMs).toBe(header.durationMs);
		expect(take!.durationMs).toBeGreaterThanOrEqual(1200);
		expect(take!.durationMs).toBeLessThanOrEqual(1250);
		expect(take!.wav).toHaveLength(44 + header.sampleCount * 2);
	});

	it('brings the loudest sample to the target level', () => {
		const { wav } = processTake(stereoTake(), 48000, CONFIG)!;

		let loudest = 0;
		for (let offset = 44; offset < wav.length; offset += 2) {
			loudest = Math.max(loudest, Math.abs(int16At(wav, offset)));
		}
		expect(loudest / 32767).toBeCloseTo(0.9, 2);
	});

	it('starts and ends without a click', () => {
		const { wav } = processTake([tone(300, 1, 22050)], 22050, CONFIG)!;

		expect(int16At(wav, 44)).toBe(0);
		expect(int16At(wav, wav.length - 2)).toBe(0);
	});

	it('gives null when nothing was heard', () => {
		expect(processTake([silence(1, 48000, 0.005)], 48000, CONFIG)).toBeNull();
		expect(processTake([new Float32Array(0)], 48000, CONFIG)).toBeNull();
		expect(processTake([], 48000, CONFIG)).toBeNull();
	});
});
