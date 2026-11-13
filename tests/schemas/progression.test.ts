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
import { ADULT_RULES } from '../../src/routes/adulte/adult-rules';
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
			starThresholds: [80, 90, 95],
			newCharWeight: 0.6,
			weakCharBoost: 2,
			themeBoost: 2,
			newCharMinCount: 5,
			recentCharWindow: 30,
			lengthSlack: 12,
			handGuide: { everyKeyUntil: 2, newKeysUntil: 34, hesitationMs: 3000 },
			starAlmostMargin: 3,
			storyPhraseEvery: 2,
			textGroupLength: 24,
			// A key fades once acquired as the report of the adult space says it.
			keyboardFade: ADULT_RULES.mastery
		});
	});

	it('has six worlds with their theme and their games', () => {
		expect(
			progression.worlds.map((world) => [world.id, world.themeId, world.gameIds] as const)
		).toEqual([
			['fr.world.dinosaures', 'dinos', ['hatching', 'drawing', 'dialogue']],
			['fr.world.cuisine', 'cuisine', ['recipe', 'tower', 'river']],
			['fr.world.animaux', 'animaux', ['drawing', 'tower', 'dialogue']],
			['fr.world.espace', 'espace', ['rocket', 'tower', 'river']],
			['fr.world.vehicules', 'vehicules', ['train', 'rocket', 'dialogue']],
			['fr.world.poste', 'general', ['dialogue', 'drawing', 'train']]
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
			[['è', 'à'], ['ç', 'ù'], [], [',', '.', ';']],
			[
				['?', '!', '"'],
				['-', ':'],
				['ê', 'â'],
				['î', 'ô', 'û'],
				['ë', 'ï']
			],
			// Useful texts (ADR-057): Enter first, then the texts of everyday life, then the digits of
			// each hand and @ for the hours, dates, scores and addresses.
			[
				[String.fromCharCode(10)],
				[],
				[],
				[],
				[],
				[],
				['1', '2', '3', '4', '5'],
				['6', '7', '8', '9', '0'],
				['@'],
				// Then a lesson of repairs: Backspace is a key, not a character (ADR-057).
				[]
			]
		]);
	});

	it('teaches the circumflexes in two lessons, the first one under the identifier it always had', () => {
		const circumflexes = lessons.filter((lesson) =>
			lesson.newChars.some((char) => 'êâîôû'.includes(char))
		);
		expect(circumflexes.map((lesson) => lesson.newChars)).toEqual([
			['ê', 'â'],
			['î', 'ô', 'û']
		]);
		expect(circumflexes[0]?.id).toBe('fr.lesson.chapeau-circonflexe');
		expect(circumflexes[1]?.title).not.toBe(circumflexes[0]?.title);
		const ids = lessons.map((lesson) => lesson.id);
		expect(ids.indexOf('fr.lesson.trema')).toBe(ids.indexOf(circumflexes[1]?.id ?? '') + 1);
	});

	it('introduces at most three characters in one lesson, or the five digits of one hand', () => {
		for (const lesson of lessons) {
			const digits = lesson.newChars.every((char) => /^[0-9]$/.test(char));
			expect(lesson.newChars.length).toBeLessThanOrEqual(digits ? 5 : 3);
		}
	});

	it('guides the hand up to the last lesson that brings a key, Backspace included (ADR-068)', () => {
		const last = lessons.findLastIndex(
			(lesson) => lesson.newChars.length > 0 || lesson.repair !== undefined
		);
		expect(progression.rules.handGuide?.newKeysUntil).toBe(last + 1);
	});

	it('warms the digits and @ up with short series written by hand', () => {
		const written = lessons.filter((lesson) => lesson.warmUp !== undefined);
		expect(written.map((lesson) => lesson.newChars.join(''))).toEqual(['12345', '67890', '@']);
		for (const lesson of written) {
			for (const group of lesson.warmUp ?? []) {
				expect(group, lesson.id).toMatch(/^[0-9@ a-z]+$/);
			}
		}
	});

	it('keeps the identifiers of the lessons that already existed', () => {
		const ids = lessons.map((lesson) => lesson.id);
		for (const id of [
			'fr.lesson.oeufs-f-j',
			'fr.lesson.saut-espace',
			'fr.lesson.nid-d-k',
			'fr.lesson.mare-s-l',
			'fr.lesson.bras-q-m',
			'fr.lesson.mots-e-i',
			'fr.lesson.chapeau-circonflexe',
			'fr.lesson.trema'
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

	it('keeps every exercise short: 24 characters at first, then about 35 (ADR-029)', () => {
		expect(lessons.slice(0, 4).map((lesson) => lesson.targetLength)).toEqual([24, 24, 24, 24]);
		expect(lessons.slice(4).every((lesson) => lesson.targetLength === 35)).toBe(true);
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

	it('keeps groups short, and few: at most 8 steps in an exercise (ADR-039)', () => {
		for (const lesson of lessons) {
			expect(lesson.groupLength[0]).toBeGreaterThanOrEqual(2);
			expect(lesson.groupLength[1]).toBeLessThanOrEqual(6);
			expect(lesson.groupCount).toBeLessThanOrEqual(8);
		}
	});
});
