import { describe, expect, it } from 'vitest';
import { voiceKey } from './voice-key';
import {
	parseVoiceRecordings,
	voiceArchiveName,
	voiceClipFile,
	type VoiceRecordingClip,
	type VoiceRecordings
} from './voice-recordings';

function clip(text: string, changes: Partial<VoiceRecordingClip> = {}): VoiceRecordingClip {
	const key = voiceKey(text);
	return {
		key,
		text,
		origin: 'fr.lesson.a#intro',
		file: `${key}.wav`,
		durationMs: 2400,
		...changes
	};
}

function recordings(changes: Partial<Record<keyof VoiceRecordings, unknown>> = {}) {
	return {
		schemaVersion: 1,
		locale: 'fr',
		credit: 'Camille',
		recordedAt: '2026-10-14T09:30:00.000Z',
		sampleRate: 22050,
		clips: [clip('Pose tes deux index.'), clip('Appuie avec un pouce.')],
		...changes
	};
}

describe('parseVoiceRecordings', () => {
	it('accepts a well-formed index and gives it back', () => {
		expect(parseVoiceRecordings(recordings())).toEqual(recordings());
	});

	it('accepts an anonymous contribution', () => {
		expect(parseVoiceRecordings(recordings({ credit: '' })).credit).toBe('');
	});

	it.each([
		['not an object', 'text', 'voiceRecordings: expected an object'],
		['another version', recordings({ schemaVersion: 2 }), 'voiceRecordings.schemaVersion'],
		['an unknown property', { ...recordings(), consent: true }, 'voiceRecordings.consent'],
		['a locale that is not one', recordings({ locale: 'FR_fr' }), 'voiceRecordings.locale'],
		['a credit that is not a string', recordings({ credit: null }), 'voiceRecordings.credit'],
		['a credit on two lines', recordings({ credit: 'Camille\nD.' }), 'voiceRecordings.credit'],
		['a credit with spaces around', recordings({ credit: ' Camille' }), 'voiceRecordings.credit'],
		['a credit that is too long', recordings({ credit: 'a'.repeat(81) }), 'voiceRecordings.credit'],
		[
			'a date without a time',
			recordings({ recordedAt: '2026-10-14' }),
			'voiceRecordings.recordedAt'
		],
		[
			'a date that does not exist',
			recordings({ recordedAt: '2026-13-45T09:30:00Z' }),
			'voiceRecordings.recordedAt'
		],
		['a fractional sample rate', recordings({ sampleRate: 0.5 }), 'voiceRecordings.sampleRate'],
		['no clip', recordings({ clips: [] }), 'voiceRecordings.clips'],
		[
			'a clip whose key is not the key of its text',
			recordings({ clips: [{ ...clip('Un texte.'), text: 'Un autre texte.' }] }),
			'clips[0].key: is not the key of the text'
		],
		[
			'a clip whose file is not named after its key',
			recordings({ clips: [clip('Un texte.', { file: 'intro.wav' })] }),
			'clips[0].file'
		],
		[
			'a clip stored in a folder',
			recordings({ clips: [clip('Un texte.', { file: `../${voiceKey('Un texte.')}.wav` })] }),
			'clips[0].file'
		],
		[
			'a clip without an origin',
			recordings({ clips: [clip('Un texte.', { origin: '' })] }),
			'clips[0].origin'
		],
		[
			'a clip without a duration',
			recordings({ clips: [clip('Un texte.', { durationMs: 0 })] }),
			'clips[0].durationMs'
		],
		[
			'an unknown clip property',
			recordings({ clips: [{ ...clip('Un texte.'), take: 2 }] }),
			'clips[0].take'
		],
		[
			'the same text twice',
			recordings({ clips: [clip('Un texte.'), clip('Un texte.')] }),
			'clips[1].key: duplicate key'
		]
	])('refuses %s', (_, data, message) => {
		expect(() => parseVoiceRecordings(data)).toThrow(message);
	});
});

describe('names of the archive and of its files', () => {
	it('names the archive after the language and the day of the export', () => {
		expect(voiceArchiveName('fr', '2026-10-14T09:30:00.000Z')).toBe('voix-fr__2026-10-14.zip');
	});

	it('names a clip after its key', () => {
		expect(voiceClipFile('af63dc4c8601ec8c')).toBe('af63dc4c8601ec8c.wav');
	});
});
