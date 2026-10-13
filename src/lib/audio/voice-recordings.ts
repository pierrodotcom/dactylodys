import { VOICE_KEY_PATTERN, voiceKey } from './voice-key';
import {
	expectLocale,
	expectPositive,
	expectPositiveInteger,
	expectRecord,
	expectText,
	fail,
	refuseUnknownKeys
} from './voice-validation';

/*
 * The index of an archive of recordings: written by the recording page (`/dev/voix`), read by
 * `tools/voice/import.js`. Both sides go through `parseVoiceRecordings`, so the page never offers
 * an archive that the import tool would refuse.
 */

export interface VoiceRecordingClip {
	/** `voiceKey(text)`. */
	readonly key: string;
	/** The text that was read aloud, as it was shown to the person. */
	readonly text: string;
	readonly origin: string;
	/** Name of the WAV file in the archive: `<key>.wav`. */
	readonly file: string;
	readonly durationMs: number;
}

export interface VoiceRecordings {
	readonly schemaVersion: 1;
	readonly locale: string;
	/** Name to credit; empty for an anonymous contribution. */
	readonly credit: string;
	/** ISO 8601 date and time of the export. */
	readonly recordedAt: string;
	readonly sampleRate: number;
	readonly clips: readonly VoiceRecordingClip[];
}

export const VOICE_RECORDINGS_FILE = 'enregistrements.json';
export const VOICE_CREDIT_MAX_LENGTH = 80;

const ROOT_KEYS = ['schemaVersion', 'locale', 'credit', 'recordedAt', 'sampleRate', 'clips'];
const CLIP_KEYS = ['key', 'text', 'origin', 'file', 'durationMs'];
const ISO_DATE_TIME_PATTERN =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const CONTROL_PATTERN = /\p{Cc}/u;
const DATE_LENGTH = 'YYYY-MM-DD'.length;

export function voiceClipFile(key: string): string {
	return `${key}.wav`;
}

/** `voix-<locale>__<date>.zip`, the date being the day of `recordedAt`. */
export function voiceArchiveName(locale: string, recordedAt: string): string {
	return `voix-${locale}__${recordedAt.slice(0, DATE_LENGTH)}.zip`;
}

function parseCredit(value: unknown): string {
	const path = 'voiceRecordings.credit';
	if (typeof value !== 'string') fail(path, 'expected a string, empty when nobody is credited');
	if (CONTROL_PATTERN.test(value)) fail(path, 'expected a single line of text');
	if (value !== value.trim()) fail(path, 'expected no space around the name');
	if (value.length > VOICE_CREDIT_MAX_LENGTH) {
		fail(path, `expected at most ${VOICE_CREDIT_MAX_LENGTH} characters`);
	}
	return value;
}

function parseClip(value: unknown, path: string): VoiceRecordingClip {
	const record = expectRecord(value, path);
	refuseUnknownKeys(record, CLIP_KEYS, path);
	const key = record['key'];
	if (typeof key !== 'string' || !VOICE_KEY_PATTERN.test(key)) {
		fail(`${path}.key`, 'expected a voice key');
	}
	const text = expectText(record['text'], `${path}.text`);
	if (voiceKey(text) !== key) fail(`${path}.key`, 'is not the key of the text');
	if (record['file'] !== voiceClipFile(key)) {
		fail(`${path}.file`, `expected "${voiceClipFile(key)}"`);
	}
	return {
		key,
		text,
		origin: expectText(record['origin'], `${path}.origin`),
		file: voiceClipFile(key),
		durationMs: expectPositive(record['durationMs'], `${path}.durationMs`)
	};
}

export function parseVoiceRecordings(data: unknown): VoiceRecordings {
	const root = expectRecord(data, 'voiceRecordings');
	refuseUnknownKeys(root, ROOT_KEYS, 'voiceRecordings');
	if (root['schemaVersion'] !== 1) fail('voiceRecordings.schemaVersion', 'expected 1');

	const recordedAt = root['recordedAt'];
	if (
		typeof recordedAt !== 'string' ||
		!ISO_DATE_TIME_PATTERN.test(recordedAt) ||
		Number.isNaN(Date.parse(recordedAt))
	) {
		fail('voiceRecordings.recordedAt', 'expected an ISO 8601 date and time');
	}

	const rawClips = root['clips'];
	if (!Array.isArray(rawClips) || rawClips.length === 0) {
		fail('voiceRecordings.clips', 'expected a non-empty array');
	}
	const keys = new Set<string>();
	const clips = rawClips.map((item: unknown, index: number) => {
		const clip = parseClip(item, `voiceRecordings.clips[${index}]`);
		if (keys.has(clip.key)) {
			fail(`voiceRecordings.clips[${index}].key`, `duplicate key "${clip.key}"`);
		}
		keys.add(clip.key);
		return clip;
	});

	return {
		schemaVersion: 1,
		locale: expectLocale(root['locale'], 'voiceRecordings.locale'),
		credit: parseCredit(root['credit']),
		recordedAt,
		sampleRate: expectPositiveInteger(root['sampleRate'], 'voiceRecordings.sampleRate'),
		clips
	};
}
