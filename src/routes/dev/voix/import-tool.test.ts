import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { voiceKey } from '$lib/audio/voice-key';
import { parseVoiceManifest } from '$lib/audio/voice-player';
import { encodeWav, readWavHeader } from '$lib/audio/voice-signal';
import {
	LOOK_REMINDER_ID,
	LOOK_REMINDER_MESSAGE,
	voiceTexts,
	type VoiceText
} from '$lib/audio/voice-texts';
import { parseProgression } from '$lib/engine/progression/definition';
import { parseStory } from '$lib/engine/story';
import { buildVoiceArchive } from './archive';
import type { Take } from './take-store';

/*
 * From the page to the published files: the archive the page builds is handed to the real
 * `tools/voice/import.js`, run by Node as the project owner will. ffmpeg is never called.
 */

const TOOL = 'tools/voice/import.js';
const SAMPLE_RATE = 22050;
function readProgression() {
	return parseProgression(
		JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
	);
}
/** What the tool expects to hear: the sources of `tools/voice/config.json`, story included. */
const TEXTS = voiceTexts(
	readProgression(),
	parseStory(JSON.parse(readFileSync('content/fr/story/azerty-decouverte.json', 'utf8')))
);
/** The reminder to look at the screen, as the page lists it: read from the messages. */
const REMINDER: VoiceText = voiceTexts(readProgression(), undefined, [
	{
		id: LOOK_REMINDER_ID,
		text: (JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>)[
			LOOK_REMINDER_MESSAGE
		] as string
	}
]).at(-1) as VoiceText;
const STALE: VoiceText = {
	key: voiceKey('Une consigne qui a été réécrite.'),
	text: 'Une consigne qui a été réécrite.',
	origin: 'fr.lesson.ancienne#intro'
};

let workDir: string;

function take(text: VoiceText, seconds: number): Take {
	const wav = encodeWav(new Float32Array(Math.round(seconds * SAMPLE_RATE)).fill(0.2), SAMPLE_RATE);
	return {
		key: text.key,
		wav,
		durationMs: readWavHeader(wav).durationMs,
		recordedAt: '2026-10-14T09:00:00.000Z'
	};
}

function writeArchive(texts: readonly VoiceText[], credit: string): string {
	const archive = buildVoiceArchive({
		texts,
		takes: new Map(texts.map((text, index) => [text.key, take(text, 0.5 + index / 10)])),
		locale: 'fr',
		credit,
		exportedAt: new Date('2026-10-14T09:30:00.000Z'),
		sampleRate: SAMPLE_RATE
	});
	const path = join(workDir, archive.fileName);
	writeFileSync(path, archive.bytes);
	return path;
}

function runImport(...args: string[]): string {
	return execFileSync(process.execPath, [TOOL, ...args, '--target', workDir, '--no-ffmpeg'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
}

function voiceFiles(): string[] {
	return readdirSync(join(workDir, 'static/voice/fr')).sort();
}

function manifest() {
	return parseVoiceManifest(
		JSON.parse(readFileSync(join(workDir, 'static/voice/fr/manifest.json'), 'utf8'))
	);
}

beforeEach(() => {
	workDir = mkdtempSync(join(tmpdir(), 'dactylodys-import-test-'));
});

afterEach(() => {
	rmSync(workDir, { recursive: true, force: true });
});

/** Each test starts Node once or twice: on a busy machine that alone can take longer than the default 5 s. */
const TOOL_TEST_TIMEOUT_MS = 60_000;

describe('tools/voice/import.js', { timeout: TOOL_TEST_TIMEOUT_MS }, () => {
	it('publishes the clips of an archive made by the page, with their manifest and credit', () => {
		const recorded = TEXTS.slice(0, 2);

		const report = runImport(writeArchive(recorded, 'Camille Testeuse'));

		expect(voiceFiles()).toEqual(
			[...recorded.map((text) => `${text.key}.wav`), 'manifest.json'].sort()
		);
		const published = manifest();
		expect(published.voice.name).toBe('Camille Testeuse');
		for (const [index, text] of recorded.entries()) {
			const wav = readFileSync(join(workDir, 'static/voice/fr', `${text.key}.wav`));
			expect(published.clips[text.key]).toEqual({
				file: `${text.key}.wav`,
				durationMs: readWavHeader(wav).durationMs
			});
			expect(readWavHeader(wav).durationMs).toBe(500 + index * 100);
		}
		const attributions = readFileSync(join(workDir, 'static/ATTRIBUTIONS.md'), 'utf8');
		expect(attributions).toContain('`static/voice/fr/`');
		expect(attributions).toContain('Camille Testeuse');
		expect(attributions).toContain('Police Atkinson Hyperlegible Next');
		expect(report).toContain('2 enregistrements importés dans static/voice/fr.');
		expect(report).toContain('Format : WAV.');
		// Every text of the page: those of the lessons, and the reminder of the games.
		expect(report).toContain(`Textes sans enregistrement : ${TEXTS.length + 1 - 2}`);
		expect(report).toContain("Enregistrements dont le texte n'existe plus : 0");
	});

	it('knows the reminder of the games, so that pruning never removes its clip', () => {
		const report = runImport(writeArchive([REMINDER], ''), '--prune');
		expect(Object.keys(manifest().clips)).toEqual([REMINDER.key]);
		expect(report).toContain("Enregistrements dont le texte n'existe plus : 0");
	});

	it('adds a second archive to the first, then prunes a clip whose text is gone', () => {
		runImport(writeArchive([TEXTS[0]!, STALE], 'Camille'));
		expect(Object.keys(manifest().clips).sort()).toEqual([TEXTS[0]!.key, STALE.key].sort());

		const report = runImport(writeArchive([TEXTS[1]!], ''), '--prune');

		const published = manifest();
		expect(Object.keys(published.clips).sort()).toEqual([TEXTS[0]!.key, TEXTS[1]!.key].sort());
		expect(published.voice.name).toBe('Camille, contribution anonyme');
		expect(existsSync(join(workDir, 'static/voice/fr', `${STALE.key}.wav`))).toBe(false);
		expect(report).toContain("Enregistrements dont le texte n'existe plus : 1 (supprimés)");
		const rows = readFileSync(join(workDir, 'static/ATTRIBUTIONS.md'), 'utf8')
			.split('\n')
			.filter((line) => line.includes('`static/voice/fr/`'));
		expect(rows).toHaveLength(1);
	});

	it('refuses a file that is not an archive of recordings, and writes nothing', () => {
		const path = join(workDir, 'notes.zip');
		writeFileSync(path, 'not a zip archive at all, only some text that is long enough');

		expect(() => runImport(path)).toThrow(/Import impossible/);
		expect(existsSync(join(workDir, 'static'))).toBe(false);
	});
});
