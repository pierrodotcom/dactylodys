import {
	expectPositive,
	expectPositiveInteger,
	expectRecord,
	expectShare,
	fail,
	refuseUnknownKeys
} from './voice-validation';

/** How a take is turned into a published clip (`content/common/voice.json`): data, never constants in the code. */
export interface VoiceConfig {
	/** Samples per second of every recorded clip, whatever the microphone gives. */
	readonly sampleRate: number;
	/** A recording left running stops by itself after this long. */
	readonly maxTakeSeconds: number;
	/** Length of the slices whose loudness tells speech from silence. */
	readonly silenceFrameMs: number;
	/** A slice quieter than this share of the loudest one is silence. */
	readonly silenceRatio: number;
	/** Kept before the first and after the last slice of speech, so that soft sounds are not cut. */
	readonly silencePaddingMs: number;
	/** A take whose loudest sample stays under this level (0 to 1) holds nothing to keep. */
	readonly minPeak: number;
	/** Level (0 to 1) the loudest sample of a clip is brought to. */
	readonly targetPeak: number;
	/** Length of the fade at both ends, which avoids a click where the take was cut. */
	readonly fadeMs: number;
	/** Bit rate of the MP3 files written by `tools/voice/import.js` when ffmpeg is there. */
	readonly mp3BitrateKbps: number;
}

const KEYS = [
	'schemaVersion',
	'sampleRate',
	'maxTakeSeconds',
	'silenceFrameMs',
	'silenceRatio',
	'silencePaddingMs',
	'minPeak',
	'targetPeak',
	'fadeMs',
	'mp3BitrateKbps'
];

function expectNotNegative(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		fail(path, 'expected a number of at least 0');
	}
	return value;
}

export function parseVoiceConfig(data: unknown): VoiceConfig {
	const root = expectRecord(data, 'voiceConfig');
	refuseUnknownKeys(root, KEYS, 'voiceConfig');
	if (root['schemaVersion'] !== 1) fail('voiceConfig.schemaVersion', 'expected 1');
	const config: VoiceConfig = {
		sampleRate: expectPositiveInteger(root['sampleRate'], 'voiceConfig.sampleRate'),
		maxTakeSeconds: expectPositive(root['maxTakeSeconds'], 'voiceConfig.maxTakeSeconds'),
		silenceFrameMs: expectPositive(root['silenceFrameMs'], 'voiceConfig.silenceFrameMs'),
		silenceRatio: expectShare(root['silenceRatio'], 'voiceConfig.silenceRatio'),
		silencePaddingMs: expectNotNegative(root['silencePaddingMs'], 'voiceConfig.silencePaddingMs'),
		minPeak: expectShare(root['minPeak'], 'voiceConfig.minPeak'),
		targetPeak: expectShare(root['targetPeak'], 'voiceConfig.targetPeak'),
		fadeMs: expectNotNegative(root['fadeMs'], 'voiceConfig.fadeMs'),
		mp3BitrateKbps: expectPositiveInteger(root['mp3BitrateKbps'], 'voiceConfig.mp3BitrateKbps')
	};
	if (config.minPeak >= config.targetPeak) {
		fail('voiceConfig.minPeak', 'expected a level under targetPeak');
	}
	return config;
}
