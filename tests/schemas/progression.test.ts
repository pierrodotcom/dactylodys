import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import { lessonIds, parseProgression } from '../../src/lib/engine/progression/definition';
import { listProgressionFiles } from '../../src/lib/engine/progression/test-support';
import { buildCharIndex, findUnproducible, parseLayout } from '../../src/lib/keyboard/layout';
import { LAYOUT_IDS } from '../../src/lib/keyboard/layout-ids';
import type { ProgressionDefinition } from '../../src/lib/engine/progression/types';

const LAYOUTS_DIR = 'layouts';

function typedText(progression: ProgressionDefinition): string[] {
	return progression.worlds.flatMap((world) =>
		world.lessons.flatMap((lesson) => [...lesson.newChars, ...lesson.words])
	);
}

const FILES = listProgressionFiles();

describe('progression files', () => {
	it('exist', () => {
		expect(FILES.length).toBeGreaterThan(0);
	});

	it.each(FILES.map((file) => [file.path, file] as const))('%s is valid', (_path, file) => {
		expect(() => parseProgression(file.data)).not.toThrow();
	});

	it.each(FILES.map((file) => [file.path, file] as const))(
		'%s is named after its content',
		(_path, file) => {
			const progression = parseProgression(file.data);
			expect(progression.id).toBe(`${file.language}.progression.${file.slug}`);
			expect(new Intl.Locale(progression.locale).language).toBe(file.language);
		}
	);

	it('use identifiers that are unique across all files', () => {
		const ids = FILES.flatMap((file) => {
			const progression = parseProgression(file.data);
			return [
				progression.id,
				...progression.worlds.map((world) => world.id),
				...lessonIds(progression)
			];
		});
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(FILES.map((file) => [file.path, file] as const))(
		'%s introduces each lesson with one short sentence',
		(_path, file) => {
			for (const world of parseProgression(file.data).worlds) {
				for (const lesson of world.lessons) {
					expect(lesson.intro).toMatch(/[.!?]$/);
					expect(lesson.intro).not.toMatch(/[.!?]\s+\S/);
					expect(lesson.intro.length).toBeLessThanOrEqual(120);
					expect(lesson.intro.toLowerCase()).not.toContain('bébé');
				}
			}
		}
	);
});

describe('progression layouts', () => {
	it.each(FILES.map((file) => [file.path, file] as const))(
		'%s only targets layouts that exist',
		(_path, file) => {
			for (const layoutId of parseProgression(file.data).layoutIds) {
				expect(LAYOUT_IDS as readonly string[]).toContain(layoutId);
			}
		}
	);

	const pairs = FILES.flatMap((file) =>
		parseProgression(file.data).layoutIds.map((layoutId) => [file.path, layoutId, file] as const)
	);

	it.each(pairs)('%s: every character is producible on %s', (_path, layoutId, file) => {
		const layout = parseLayout(JSON.parse(readFileSync(`${LAYOUTS_DIR}/${layoutId}.json`, 'utf8')));
		const index = buildCharIndex(layout);
		const text = typedText(parseProgression(file.data)).join('');
		expect(toGraphemes(text).length).toBeGreaterThan(0);
		expect(findUnproducible(index, text)).toEqual([]);
	});
});

describe('azerty-decouverte', () => {
	const file = FILES.find((candidate) => candidate.slug === 'azerty-decouverte');
	const progression = parseProgression(file?.data);

	it('targets both French AZERTY layouts', () => {
		expect(progression.layoutIds).toEqual(['fr-fr-azerty-pc', 'fr-fr-azerty-mac']);
	});

	it('uses the agreed rules', () => {
		expect(progression.rules).toEqual({
			unlockAccuracy: 80,
			starThresholds: [80, 90, 97],
			newCharWeight: 0.6
		});
	});

	it('has one dinosaur world with six lessons in the agreed order', () => {
		expect(progression.worlds).toHaveLength(1);
		expect(progression.worlds[0]?.id).toBe('fr.world.dinosaures');
		expect(progression.worlds[0]?.themeId).toBe('dinos');
		expect(progression.worlds[0]?.lessons.map((lesson) => lesson.newChars)).toEqual([
			['f', 'j'],
			[' '],
			['d', 'k'],
			['s', 'l'],
			['q', 'm'],
			['e', 'i']
		]);
	});

	it('keeps groups short at first and real words for the last lesson only', () => {
		const lessons = progression.worlds[0]?.lessons ?? [];
		expect(lessons.map((lesson) => lesson.words.length > 0)).toEqual([
			false,
			false,
			false,
			false,
			false,
			true
		]);
		for (const lesson of lessons) {
			expect(lesson.groupCount).toBeGreaterThanOrEqual(8);
			expect(lesson.groupLength[0]).toBeGreaterThanOrEqual(2);
			expect(lesson.groupLength[1]).toBeLessThanOrEqual(5);
		}
		expect(lessons.at(-1)?.words.length).toBeGreaterThanOrEqual(15);
	});
});
