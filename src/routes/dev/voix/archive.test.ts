import { describe, expect, it } from 'vitest';
import { voiceKey } from '$lib/audio/voice-key';
import { parseVoiceRecordings } from '$lib/audio/voice-recordings';
import { encodeWav, readWavHeader } from '$lib/audio/voice-signal';
import type { VoiceText } from '$lib/audio/voice-texts';
import { readZipEntry } from '$lib/audio/zip-test-support';
import { buildVoiceArchive, recordedTexts, tidyCredit, type ArchiveInput } from './archive';
import type { Take } from './take-store';

const SAMPLE_RATE = 22050;
const EXPORTED_AT = new Date('2026-10-14T09:30:00.000Z');

function text(value: string, origin: string): VoiceText {
	return { key: voiceKey(value), text: value, origin };
}

const TEXTS = [
	text('Pose tes deux index sur F et J.', 'fr.lesson.a#intro'),
	text('Appuie avec un pouce sur la grande barre.', 'fr.lesson.b#intro'),
	text('Garde les index à leur place.', 'fr.lesson.c#intro')
];

function take(value: string, seconds: number): Take {
	const wav = encodeWav(new Float32Array(Math.round(seconds * SAMPLE_RATE)).fill(0.1), SAMPLE_RATE);
	return {
		key: voiceKey(value),
		wav,
		durationMs: readWavHeader(wav).durationMs,
		recordedAt: '2026-10-13T18:00:00.000Z'
	};
}

function takes(...list: Take[]): Map<string, Take> {
	return new Map(list.map((item) => [item.key, item]));
}

function input(changes: Partial<ArchiveInput> = {}): ArchiveInput {
	return {
		texts: TEXTS,
		takes: takes(take(TEXTS[2]!.text, 0.5), take(TEXTS[0]!.text, 1)),
		locale: 'fr',
		credit: 'Camille',
		exportedAt: EXPORTED_AT,
		sampleRate: SAMPLE_RATE,
		...changes
	};
}

describe('buildVoiceArchive', () => {
	it('names the archive after the language and the day of the export', () => {
		expect(buildVoiceArchive(input()).fileName).toBe('voix-fr__2026-10-14.zip');
	});

	it('writes an index that the import tool accepts, read back by the zip reader of the project', async () => {
		const archive = buildVoiceArchive(input());

		const index = JSON.parse(
			new TextDecoder().decode(await readZipEntry(archive.bytes, 'enregistrements.json'))
		);

		expect(parseVoiceRecordings(index)).toEqual(archive.recordings);
		expect(index).toEqual({
			schemaVersion: 1,
			locale: 'fr',
			credit: 'Camille',
			recordedAt: '2026-10-14T09:30:00.000Z',
			sampleRate: SAMPLE_RATE,
			clips: [
				{
					key: TEXTS[0]!.key,
					text: TEXTS[0]!.text,
					origin: 'fr.lesson.a#intro',
					file: `${TEXTS[0]!.key}.wav`,
					durationMs: 1000
				},
				{
					key: TEXTS[2]!.key,
					text: TEXTS[2]!.text,
					origin: 'fr.lesson.c#intro',
					file: `${TEXTS[2]!.key}.wav`,
					durationMs: 500
				}
			]
		});
	});

	it('holds one WAV file per recorded text, with the bytes of its take', async () => {
		const given = input();
		const archive = buildVoiceArchive(given);

		for (const clip of archive.recordings.clips) {
			const wav = await readZipEntry(archive.bytes, clip.file);
			expect(wav).toEqual(given.takes.get(clip.key)?.wav);
			expect(readWavHeader(wav)).toMatchObject({ sampleRate: SAMPLE_RATE, channels: 1 });
		}
		await expect(readZipEntry(archive.bytes, `${TEXTS[1]!.key}.wav`)).rejects.toThrow('not found');
	});

	it('leaves out a take whose text is no longer to be said', async () => {
		const stale = take('Un texte réécrit depuis.', 1);
		const given = input({ takes: takes(take(TEXTS[0]!.text, 1), stale) });

		const archive = buildVoiceArchive(given);

		expect(archive.recordings.clips.map((clip) => clip.key)).toEqual([TEXTS[0]!.key]);
		await expect(readZipEntry(archive.bytes, `${stale.key}.wav`)).rejects.toThrow('not found');
	});

	it('writes an empty credit for an anonymous contribution', () => {
		expect(buildVoiceArchive(input({ credit: '   ' })).recordings.credit).toBe('');
	});

	it('tidies the name to credit', () => {
		expect(buildVoiceArchive(input({ credit: '  Camille \n Dupont ' })).recordings.credit).toBe(
			'Camille Dupont'
		);
	});

	it('refuses to build an archive without any take', () => {
		expect(() => buildVoiceArchive(input({ takes: new Map() }))).toThrow('voiceRecordings.clips');
	});

	it('refuses a name to credit that is too long', () => {
		expect(() => buildVoiceArchive(input({ credit: 'a'.repeat(200) }))).toThrow(
			'voiceRecordings.credit'
		);
	});
});

describe('recordedTexts', () => {
	it('lists the texts that have a take, in the order of the course', () => {
		const recorded = recordedTexts(TEXTS, takes(take(TEXTS[2]!.text, 1), take(TEXTS[1]!.text, 1)));

		expect(recorded).toEqual([TEXTS[1], TEXTS[2]]);
	});
});

describe('tidyCredit', () => {
	it('keeps a name as it is and collapses stray spaces', () => {
		expect(tidyCredit('Camille Dupont')).toBe('Camille Dupont');
		expect(tidyCredit('\tCamille   Dupont\n')).toBe('Camille Dupont');
		expect(tidyCredit('')).toBe('');
	});
});
