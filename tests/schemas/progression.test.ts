import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	learnedChars,
	lessonIds,
	parseProgression
} from '../../src/lib/engine/progression/definition';
import { listProgressionFiles } from '../../src/lib/engine/progression/test-support';
import { buildCharIndex, findUnproducible, parseLayout } from '../../src/lib/keyboard/layout';
import { LAYOUT_IDS } from '../../src/lib/keyboard/layout-ids';
import type {
	LessonDefinition,
	ProgressionDefinition
} from '../../src/lib/engine/progression/types';

const LAYOUTS_DIR = 'layouts';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function typedText(progression: ProgressionDefinition, lesson: LessonDefinition): string[] {
	return [...learnedChars(progression, lesson.id), ...lesson.words];
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
		'%s gives each world a theme and games with a lowercase hyphenated identifier',
		(_path, file) => {
			for (const world of parseProgression(file.data).worlds) {
				expect(world.themeId).toMatch(SLUG_PATTERN);
				expect(world.gameIds.length).toBeGreaterThan(0);
				for (const gameId of world.gameIds) expect(gameId).toMatch(SLUG_PATTERN);
				expect(new Set(world.gameIds).size).toBe(world.gameIds.length);
			}
		}
	);

	it.each(FILES.map((file) => [file.path, file] as const))(
		'%s gives every lesson a mix, a target length and known unlocks',
		(_path, file) => {
			for (const world of parseProgression(file.data).worlds) {
				for (const lesson of world.lessons) {
					const { drills, words, phrases } = lesson.mix;
					expect(drills + words + phrases).toBeGreaterThan(0);
					expect(lesson.targetLength).toBeGreaterThanOrEqual(1);
					for (const unlock of lesson.unlocks) expect(['uppercase']).toContain(unlock);
				}
			}
		}
	);

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
		const progression = parseProgression(file.data);
		for (const lesson of progression.worlds.flatMap((world) => world.lessons)) {
			const text = typedText(progression, lesson).join('');
			expect(toGraphemes(text).length).toBeGreaterThan(0);
			expect(findUnproducible(index, text), lesson.id).toEqual([]);
		}
	});
});

describe('azerty-decouverte', () => {
	const file = FILES.find((candidate) => candidate.slug === 'azerty-decouverte');
	const progression = parseProgression(file?.data);
	const lessons = progression.worlds.flatMap((world) => world.lessons);

	it('targets both French AZERTY layouts', () => {
		expect(progression.layoutIds).toEqual(['fr-fr-azerty-pc', 'fr-fr-azerty-mac']);
	});

	it('uses the agreed rules', () => {
		expect(progression.rules).toEqual({
			unlockAccuracy: 80,
			starThresholds: [80, 90, 97],
			newCharWeight: 0.6,
			weakCharBoost: 2,
			themeBoost: 2,
			newCharMinCount: 5
		});
	});

	it('has five worlds with their theme and their games', () => {
		expect(
			progression.worlds.map((world) => [world.id, world.themeId, world.gameIds] as const)
		).toEqual([
			['fr.world.dinosaures', 'dinos', ['hatching']],
			['fr.world.cuisine', 'cuisine', ['recipe', 'hatching']],
			['fr.world.animaux', 'animaux', ['hatching', 'recipe']],
			['fr.world.espace', 'espace', ['rocket', 'recipe', 'hatching']],
			['fr.world.vehicules', 'vehicules', ['rocket', 'hatching', 'recipe']]
		]);
	});

	it('introduces the keys in the agreed order', () => {
		expect(
			progression.worlds.map((world) => world.lessons.map((lesson) => lesson.newChars))
		).toEqual([
			[['f', 'j'], [' '], ['d', 'k'], ['s', 'l'], ['e', 'i'], ['r', 'u']],
			[
				['t', 'n'],
				['a', 'o'],
				['q', 'm'],
				['c', 'p'],
				['é', "'"]
			],
			[
				['g', 'h'],
				['v', 'b'],
				['y', 'x'],
				['z', 'w']
			],
			[['è', 'à'], ['ç', 'ù'], [], [',', '.']],
			[
				['?', '!'],
				['-', ':'],
				['ê', 'â', 'î', 'ô', 'û'],
				['ë', 'ï', 'ü']
			]
		]);
	});

	it('keeps the identifiers of the lessons that already existed', () => {
		const ids = lessons.map((lesson) => lesson.id);
		for (const id of [
			'fr.lesson.oeufs-f-j',
			'fr.lesson.saut-espace',
			'fr.lesson.nid-d-k',
			'fr.lesson.mare-s-l',
			'fr.lesson.bras-q-m',
			'fr.lesson.mots-e-i'
		]) {
			expect(ids).toContain(id);
		}
	});

	it('unlocks capitals in the lesson without new character, and nowhere else', () => {
		const unlocking = lessons.filter((lesson) => lesson.unlocks.length > 0);
		expect(unlocking).toHaveLength(1);
		expect(unlocking[0]?.unlocks).toEqual(['uppercase']);
		expect(unlocking[0]?.newChars).toEqual([]);
	});

	it('keeps the first four lessons short and the later ones longer', () => {
		expect(lessons.slice(0, 4).map((lesson) => lesson.targetLength)).toEqual([24, 24, 24, 24]);
		expect(lessons.slice(4, 11).every((lesson) => lesson.targetLength === 60)).toBe(true);
		expect(lessons.slice(11).every((lesson) => lesson.targetLength === 90)).toBe(true);
	});

	it('mixes suites only until a word is possible, then mostly words, then mostly phrases', () => {
		for (const lesson of lessons.slice(0, 4)) {
			expect(lesson.mix).toEqual({ drills: 1, words: 0, phrases: 0 });
			expect(lesson.words).toEqual([]);
		}
		for (const lesson of lessons.slice(4)) {
			expect(lesson.mix.words).toBeGreaterThan(lesson.mix.drills);
		}
		for (const lesson of lessons.slice(4, 6)) expect(lesson.mix.phrases).toBe(0);
		for (const lesson of lessons.slice(6, 11)) expect(lesson.mix.phrases).toBeGreaterThan(0);
		for (const world of progression.worlds.slice(3)) {
			for (const lesson of world.lessons) {
				expect(lesson.mix.phrases).toBeGreaterThan(lesson.mix.drills + lesson.mix.words);
			}
		}
	});

	it('hand-picks words for e i and r u only', () => {
		expect(lessons.map((lesson) => lesson.words.length > 0)).toEqual(
			lessons.map((_, index) => index === 4 || index === 5)
		);
		for (const lesson of lessons.slice(4, 6)) {
			expect(lesson.words.length).toBeGreaterThanOrEqual(15);
		}
		expect(lessons[5]?.words).toEqual(
			expect.arrayContaining(['sur', 'dur', 'rue', 'lire', 'rire'])
		);
		expect(lessons[4]?.words).toEqual(expect.arrayContaining(['je', 'de', 'il', 'le', 'les']));
	});

	it('keeps groups short', () => {
		for (const lesson of lessons) {
			expect(lesson.groupLength[0]).toBeGreaterThanOrEqual(2);
			expect(lesson.groupLength[1]).toBeLessThanOrEqual(5);
		}
	});
});
