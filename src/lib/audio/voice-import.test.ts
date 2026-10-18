import { readFileSync } from 'node:fs';
import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';
import { updateAttributions, voiceAttributionRow } from '../../../tools/voice/lib/attributions';
import {
	ANONYMOUS_CREDIT,
	formatBytes,
	mergeCredits,
	planImport,
	renderReport,
	serializeManifest,
	type ImportInput
} from '../../../tools/voice/lib/import-plan';
import { voiceKey } from './voice-key';
import { parseVoiceManifest } from './voice-player';
import type { VoiceRecordings } from './voice-recordings';
import type { VoiceText } from './voice-texts';
import type { VoiceManifest } from './voice-types';

/*
 * The pure half of `tools/voice/import.js`. It lives here because the test runner only looks
 * under `src/` and `tests/`; the tool itself is run for real by
 * `src/routes/dev/voix/import-tool.test.ts`.
 */

const ATTRIBUTIONS_PATH = 'static/ATTRIBUTIONS.md';

function text(value: string, origin: string): VoiceText {
	return { key: voiceKey(value), text: value, origin };
}

const A = text('Pose tes deux index.', 'fr.lesson.a#intro');
const B = text('Appuie avec un pouce.', 'fr.lesson.b#intro');
const C = text('Garde les index à leur place.', 'fr.lesson.c#intro');
const OLD = text('Un texte réécrit depuis.', 'fr.lesson.z#intro');

function recordings(texts: readonly VoiceText[], credit = 'Camille'): VoiceRecordings {
	return {
		schemaVersion: 1,
		locale: 'fr',
		credit,
		recordedAt: '2026-10-14T09:30:00.000Z',
		sampleRate: 22050,
		clips: texts.map((item) => ({ ...item, file: `${item.key}.wav`, durationMs: 1 }))
	};
}

function published(files: Record<string, string>, name = 'Camille'): VoiceManifest {
	return {
		schemaVersion: 1,
		locale: 'fr',
		voice: { name, source: 'Ancienne source', license: 'CC BY-SA 4.0' },
		clips: Object.fromEntries(
			Object.entries(files).map(([key, file]) => [key, { file, durationMs: 1500 }])
		)
	};
}

function input(changes: Partial<ImportInput> = {}): ImportInput {
	const given = changes.recordings ?? recordings([A, B]);
	return {
		recordings: given,
		durations: new Map(given.clips.map((clip, index) => [clip.key, 2000 + index])),
		existing: null,
		texts: [A, B, C],
		format: 'mp3',
		prune: false,
		...changes
	};
}

async function passesPrettier(content: string, path: string): Promise<boolean> {
	const options = await prettier.resolveConfig(path);
	return prettier.check(content, { ...options, filepath: path });
}

describe('planImport', () => {
	it('publishes every clip of the archive under its key, in the chosen format', () => {
		const plan = planImport(input());

		expect(plan.writes).toEqual([
			{ key: A.key, source: `${A.key}.wav`, file: `${A.key}.mp3` },
			{ key: B.key, source: `${B.key}.wav`, file: `${B.key}.mp3` }
		]);
		expect(plan.deletes).toEqual([]);
		expect(planImport(input({ format: 'wav' })).writes.map((write) => write.file)).toEqual([
			`${A.key}.wav`,
			`${B.key}.wav`
		]);
	});

	it('builds a manifest the app accepts, with the length read from each sound file', () => {
		const { manifest } = planImport(input());

		expect(parseVoiceManifest(manifest)).toEqual(manifest);
		expect(manifest).toMatchObject({ locale: 'fr', voice: { name: 'Camille' } });
		expect(manifest.clips[A.key]).toEqual({ file: `${A.key}.mp3`, durationMs: 2000 });
		expect(manifest.clips[B.key]).toEqual({ file: `${B.key}.mp3`, durationMs: 2001 });
		expect(manifest.voice.license).toBe('CC BY-SA 4.0');
	});

	it('lists the keys of the manifest in a stable order', () => {
		const forward = planImport(input({ recordings: recordings([A, B, C]) })).manifest;
		const backward = planImport(input({ recordings: recordings([C, B, A]) })).manifest;

		expect(Object.keys(forward.clips)).toEqual(Object.keys(backward.clips));
		expect(Object.keys(forward.clips)).toEqual([A.key, B.key, C.key].sort());
	});

	it('tells which texts still have no recording', () => {
		expect(planImport(input()).missing).toEqual([C]);
		expect(planImport(input({ recordings: recordings([A, B, C]) })).missing).toEqual([]);
	});

	it('keeps what was already published and adds to it', () => {
		const existing = published({ [C.key]: `${C.key}.mp3` });

		const plan = planImport(input({ existing }));

		expect(Object.keys(plan.manifest.clips).sort()).toEqual([A.key, B.key, C.key].sort());
		expect(plan.manifest.clips[C.key]).toEqual({ file: `${C.key}.mp3`, durationMs: 1500 });
		expect(plan.missing).toEqual([]);
		expect(plan.deletes).toEqual([]);
	});

	it('replaces a clip recorded again, and removes its file when the format changes', () => {
		const existing = published({ [A.key]: `${A.key}.wav`, [B.key]: `${B.key}.mp3` });

		const plan = planImport(input({ existing }));

		expect(plan.manifest.clips[A.key]).toEqual({ file: `${A.key}.mp3`, durationMs: 2000 });
		expect(plan.deletes).toEqual([`${A.key}.wav`]);
	});

	it('reports the recordings whose text no longer exists, and keeps them without --prune', () => {
		const existing = published({ [OLD.key]: `${OLD.key}.mp3` });
		const stale = text('Un autre texte disparu.', 'fr.lesson.y#intro');

		const plan = planImport(input({ existing, recordings: recordings([A, stale]) }));

		expect(plan.orphans).toEqual(
			[
				{ key: OLD.key, file: `${OLD.key}.mp3`, text: null },
				{ key: stale.key, file: `${stale.key}.mp3`, text: stale.text }
			].sort((a, b) => (a.key < b.key ? -1 : 1))
		);
		expect(plan.pruned).toBe(false);
		expect(Object.keys(plan.manifest.clips)).toContain(OLD.key);
		expect(Object.keys(plan.manifest.clips)).toContain(stale.key);
		expect(plan.deletes).toEqual([]);
	});

	it('removes them with --prune: neither written, nor kept, nor listed in the manifest', () => {
		const existing = published({ [OLD.key]: `${OLD.key}.mp3`, [C.key]: `${C.key}.mp3` });
		const stale = text('Un autre texte disparu.', 'fr.lesson.y#intro');

		const plan = planImport(input({ existing, recordings: recordings([A, stale]), prune: true }));

		expect(plan.pruned).toBe(true);
		expect(plan.orphans.map((orphan) => orphan.key).sort()).toEqual([OLD.key, stale.key].sort());
		expect(Object.keys(plan.manifest.clips).sort()).toEqual([A.key, C.key].sort());
		expect(plan.writes.map((write) => write.key)).toEqual([A.key]);
		expect(plan.deletes).toEqual([`${OLD.key}.mp3`]);
	});

	it('refuses an archive in another language than the published voice', () => {
		const existing = { ...published({}), locale: 'en' };

		expect(() => planImport(input({ existing }))).toThrow('"en"');
	});

	it('refuses a clip whose sound file was not read', () => {
		expect(() => planImport(input({ durations: new Map() }))).toThrow('No duration');
	});
});

describe('mergeCredits', () => {
	it('credits the person named by the archive', () => {
		expect(mergeCredits(undefined, 'Camille')).toBe('Camille');
	});

	it('credits an anonymous contribution when no name was given', () => {
		expect(mergeCredits(undefined, '')).toBe(ANONYMOUS_CREDIT);
		expect(mergeCredits(undefined, '  ')).toBe(ANONYMOUS_CREDIT);
	});

	it('keeps crediting those who lent their voice before', () => {
		expect(mergeCredits('Camille', 'Dominique')).toBe('Camille, Dominique');
		expect(mergeCredits('Camille, Dominique', 'Camille')).toBe('Camille, Dominique');
		expect(mergeCredits('Camille', '')).toBe(`Camille, ${ANONYMOUS_CREDIT}`);
	});
});

describe('serializeManifest', () => {
	it('writes JSON that reads back to the same manifest and that Prettier leaves alone', async () => {
		const { manifest } = planImport(input());

		const json = serializeManifest(manifest);

		expect(parseVoiceManifest(JSON.parse(json))).toEqual(manifest);
		expect(await passesPrettier(json, 'static/voice/fr/manifest.json')).toBe(true);
	});
});

describe('renderReport', () => {
	it('tells what was imported, what is missing, what is orphaned and the total weight', () => {
		const existing = published({ [OLD.key]: `${OLD.key}.mp3` });
		const plan = planImport(input({ existing }));

		const report = renderReport({
			plan,
			directory: 'static/voice/fr',
			format: 'mp3',
			mp3BitrateKbps: 64,
			totalBytes: 1_300_000
		});

		expect(report).toContain('2 enregistrements importés dans static/voice/fr.');
		expect(report).toContain('MP3 mono à 64 kbit/s');
		expect(report).toContain('Crédit : Camille.');
		expect(report).toContain('Textes sans enregistrement : 1');
		expect(report).toContain(`  - fr.lesson.c#intro : « ${C.text} »`);
		expect(report).toContain(
			"Enregistrements dont le texte n'existe plus : 1 (relance avec --prune"
		);
		expect(report).toContain(`  - ${OLD.key}.mp3`);
		expect(report).toContain('Poids total : 1,2 Mo pour 3 fichiers.');
	});

	it('says when the files were kept as WAV, and when the orphans were removed', () => {
		const existing = published({ [OLD.key]: `${OLD.key}.wav` });
		const plan = planImport(
			input({ existing, format: 'wav', prune: true, recordings: recordings([A]) })
		);

		const report = renderReport({
			plan,
			directory: 'static/voice/fr',
			format: 'wav',
			mp3BitrateKbps: 64,
			totalBytes: 2048
		});

		expect(report).toContain('1 enregistrement importé dans');
		expect(report).toContain('Format : WAV. ffmpeg est absent du PATH');
		expect(report).toContain("texte n'existe plus : 1 (supprimés)");
		expect(report).toContain('Poids total : 2 Ko pour 1 fichier.');
	});

	it('reports plain zeros when everything is in order', () => {
		const plan = planImport(input({ recordings: recordings([A, B, C]) }));

		const report = renderReport({
			plan,
			directory: 'static/voice/fr',
			format: 'mp3',
			mp3BitrateKbps: 64,
			totalBytes: 900
		});

		expect(report).toContain('Textes sans enregistrement : 0\n');
		expect(report).toContain("Enregistrements dont le texte n'existe plus : 0\n");
		expect(report).toContain('Poids total : 900 octets pour 3 fichiers.');
	});
});

describe('formatBytes', () => {
	it('writes sizes the French way', () => {
		expect(formatBytes(0)).toBe('0 octets');
		expect(formatBytes(1536)).toBe('1,5 Ko');
		expect(formatBytes(6_606_029)).toBe('6,3 Mo');
	});
});

describe('updateAttributions', () => {
	// The shipped file, without the rows of voices already published: each test adds its own.
	const shipped = readFileSync(ATTRIBUTIONS_PATH, 'utf8')
		.split('\n')
		.filter((line) => !line.includes('`static/voice/'))
		.join('\n');

	function rowsOf(markdown: string): string[] {
		return markdown.split('\n').filter((line) => line.startsWith('|'));
	}

	it('adds the voice at the end of the table, with its author, source and license', () => {
		const updated = updateAttributions(shipped, 'fr', 'Camille');

		const rows = rowsOf(updated);
		expect(rows).toHaveLength(rowsOf(shipped).length + 1);
		const cells = rows
			.at(-1)!
			.split('|')
			.map((cell) => cell.trim());
		expect(cells.slice(1, -1)).toEqual(voiceAttributionRow('fr', 'Camille'));
		expect(cells[1]).toContain('`static/voice/fr/`');
		expect(cells[4]).toBe('CC BY-SA 4.0');
	});

	it('keeps every other row and the text around the table', () => {
		const updated = updateAttributions(shipped, 'fr', 'Camille');

		const cellsOf = (markdown: string) =>
			rowsOf(markdown).map((row) => row.split('|').map((cell) => cell.trim()));
		expect(cellsOf(updated).slice(2, -1)).toEqual(cellsOf(shipped).slice(2));
		expect(updated.startsWith(shipped.slice(0, shipped.indexOf('|')))).toBe(true);
		expect(updated.endsWith('\n')).toBe(true);
	});

	it('leaves the file formatted the way Prettier wants it', async () => {
		expect(await passesPrettier(shipped, ATTRIBUTIONS_PATH)).toBe(true);

		const updated = updateAttributions(shipped, 'fr', 'Camille Dupont-Martin');

		expect(await passesPrettier(updated, ATTRIBUTIONS_PATH)).toBe(true);
	});

	it('updates the row of the voice instead of adding a second one', async () => {
		const once = updateAttributions(shipped, 'fr', 'Camille');

		const twice = updateAttributions(once, 'fr', 'Camille, Dominique');

		expect(rowsOf(twice)).toHaveLength(rowsOf(once).length);
		expect(twice).toContain('Camille, Dominique');
		expect(updateAttributions(twice, 'fr', 'Camille, Dominique')).toBe(twice);
		expect(await passesPrettier(twice, ATTRIBUTIONS_PATH)).toBe(true);
	});

	it('gives each language its own row', () => {
		const both = updateAttributions(updateAttributions(shipped, 'fr', 'Camille'), 'en', 'Robin');

		expect(rowsOf(both)).toHaveLength(rowsOf(shipped).length + 2);
	});

	it('keeps a name with a vertical bar from breaking the table', async () => {
		const updated = updateAttributions(shipped, 'fr', 'Camille | Studio');

		expect(updated).toContain('Camille \\| Studio');
		expect(rowsOf(updateAttributions(updated, 'fr', 'Camille'))).toHaveLength(
			rowsOf(shipped).length + 1
		);
		expect(await passesPrettier(updated, ATTRIBUTIONS_PATH)).toBe(true);
	});

	it('refuses a file without a table', () => {
		expect(() => updateAttributions('# Attributions\n', 'fr', 'Camille')).toThrow('No table');
	});
});
