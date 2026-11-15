import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { parseWordBank } from './banks';
import { findLesson, learnedChars, parseProgression } from './definition';
import { drawWarmUp, generateExercise } from './exercise';
import { seededRng } from './test-support';
import type { ExerciseContext, LessonDefinition, ProgressionDefinition } from './types';

/**
 * A stable frame, a varied practice: an exercise keeps its number of groups, its length and its
 * guarantees, but two exercises of a lesson seldom open with the same groups.
 */

const SPACE = ' ';
const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const RUNS = Array.from({ length: 200 }, (_, seed) => seed);

const RULES = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 3,
	recentCharWindow: 30,
	lengthSlack: 8,
	wordWarmUp: { minWords: 1, maxWordLength: 6 },
	warmUpReserveSlack: 5,
	suiteFreeMinWords: 6
};

function lesson(id: string, newChars: string[], change: Record<string, unknown> = {}) {
	return {
		id: `fr.lesson.${id}`,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 1, words: 3, phrases: 0 },
		unlocks: [],
		groupCount: 8,
		targetLength: 30,
		groupLength: [4, 6],
		...change
	};
}

const DRILLS_ONLY = { mix: { drills: 1, words: 0, phrases: 0 }, targetLength: 16 };
const WRITTEN = ['le fil.', 'je lis.', 'il file.'];
const ALTERNATIVES = [['le sel.', 'les fils.'], ['je dis.'], []];
const PLACES = WRITTEN.map((group, place) => [group, ...(ALTERNATIVES[place] ?? [])]);

function progressionOf(reserve: unknown, rules: Record<string, unknown> = {}) {
	return parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.variety',
		locale: 'fr-FR',
		layoutIds: ['fr-fr-azerty-pc'],
		rules: { ...RULES, ...rules },
		worlds: [
			{
				id: 'fr.world.variety',
				title: 'Variety',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons: [
					lesson('fj', ['f', 'j'], { ...DRILLS_ONLY, groupLength: [2, 4] }),
					lesson('space', [SPACE], { ...DRILLS_ONLY, groupLength: [3, 4] }),
					lesson('dk', ['d', 'k'], { ...DRILLS_ONLY, groupLength: [3, 5] }),
					lesson('sl', ['s', 'l'], { ...DRILLS_ONLY, groupLength: [3, 5] }),
					lesson('ei', ['e', 'i']),
					lesson('dot', ['.'], {
						warmUp: WRITTEN,
						...(reserve === undefined ? {} : { warmUpReserve: reserve })
					})
				]
			}
		]
	});
}

const FIXED = progressionOf(undefined);
const DRAWN = progressionOf({ alternatives: ALTERNATIVES });
const FIRST_KEPT = progressionOf({ alternatives: ALTERNATIVES, keepFirst: true });
const ORDER_ONLY = progressionOf({});

function wordsOf(entries: [string, 1 | 2 | 3][]) {
	return parseWordBank({
		schemaVersion: 1,
		id: 'fr.words.variety',
		locale: 'fr-FR',
		sources: [],
		themes: [],
		words: entries.map(([text, level]) => ({ text, themes: [], level, review: 'agent' }))
	});
}

const WORD_TEXTS = [
	'le',
	'les',
	'elle',
	'il',
	'ils',
	'fil',
	'fils',
	'sel',
	'ses',
	'si',
	'ski',
	'dis',
	'de',
	'des',
	'je',
	'elfe',
	'file',
	'fille',
	'lisse'
];
const WORDS = wordsOf(WORD_TEXTS.map((text) => [text, 1]));
const CONTEXT: ExerciseContext = { words: WORDS };

function lessonOf(progression: ProgressionDefinition, id: string): LessonDefinition {
	return findLesson(progression, `fr.lesson.${id}`) as LessonDefinition;
}

function generate(
	progression: ProgressionDefinition,
	id: string,
	seed: number,
	context: ExerciseContext = CONTEXT
) {
	return generateExercise(progression, `fr.lesson.${id}`, seededRng(seed), context);
}

function countOf(groups: readonly string[], char: string): number {
	return groups.flatMap((group) => toGraphemes(group)).filter((grapheme) => grapheme === char)
		.length;
}

function lengthOf(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

/** How often the most frequent value comes, from 0 to 1. */
function topShare(values: readonly string[]): number {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return Math.max(...counts.values()) / values.length;
}

describe('drawWarmUp', () => {
	it('gives the warm-up as written without a reserve, and draws nothing', () => {
		const rng = () => {
			throw new Error('no draw expected');
		};
		expect(drawWarmUp(lessonOf(FIXED, 'dot'), rng)).toEqual(WRITTEN);
		expect(drawWarmUp(lessonOf(FIXED, 'ei'), rng)).toEqual([]);
	});

	it('draws one group for each place, the written one or one of its alternatives', () => {
		const seen = new Set<string>();
		for (const seed of RUNS) {
			const drawn = drawWarmUp(lessonOf(DRAWN, 'dot'), seededRng(seed));
			expect(drawn).toHaveLength(WRITTEN.length);
			for (const options of PLACES) {
				expect(drawn.filter((group) => options.includes(group))).toHaveLength(1);
			}
			for (const group of drawn) seen.add(group);
		}
		expect([...seen].sort()).toEqual(PLACES.flat().sort());
	});

	it('gives the places in a drawn order', () => {
		const firsts = RUNS.map((seed) => drawWarmUp(lessonOf(DRAWN, 'dot'), seededRng(seed))[0]);
		expect(new Set(firsts).size).toBe(PLACES.flat().length);
		expect(topShare(firsts as string[])).toBeLessThan(0.5);
		const orders = RUNS.map((seed) =>
			drawWarmUp(lessonOf(ORDER_ONLY, 'dot'), seededRng(seed)).join('|')
		);
		// Without alternatives the groups are those written, in each of their six orders.
		expect(new Set(orders).size).toBe(6);
		for (const order of orders) expect(order.split('|').sort()).toEqual([...WRITTEN].sort());
	});

	it('keeps the first place first when the reserve says so, and draws the order of the others', () => {
		const first = PLACES[0] as string[];
		const seconds = new Set<string>();
		for (const seed of RUNS) {
			const drawn = drawWarmUp(lessonOf(FIRST_KEPT, 'dot'), seededRng(seed));
			expect(first).toContain(drawn[0]);
			seconds.add(drawn[1] as string);
		}
		expect([...seconds].sort()).toEqual([...(PLACES[1] as string[]), 'il file.'].sort());
	});

	it('is the same draw for the same random values', () => {
		for (const seed of RUNS.slice(0, 20)) {
			expect(drawWarmUp(lessonOf(DRAWN, 'dot'), seededRng(seed))).toEqual(
				drawWarmUp(lessonOf(DRAWN, 'dot'), seededRng(seed))
			);
		}
	});
});

describe('exercise that opens with a warm-up drawn from a reserve', () => {
	it('opens with the warm-up as written when the lesson has no reserve', () => {
		for (const seed of RUNS.slice(0, 40)) {
			expect(generate(FIXED, 'dot', seed).groups.slice(0, WRITTEN.length)).toEqual(WRITTEN);
		}
	});

	it('keeps the guarantees of the warm-up as written, whatever the draw', () => {
		const written = lengthOf(WRITTEN);
		fc.assert(
			fc.property(SEEDS, fc.constantFrom(DRAWN, FIRST_KEPT, ORDER_ONLY), (seed, progression) => {
				const exercise = generate(progression, 'dot', seed);
				const warmUp = exercise.groups.slice(0, WRITTEN.length);
				// Each new character as often as a written warm-up must, no group twice.
				expect(countOf(warmUp, '.')).toBeGreaterThanOrEqual(RULES.newCharMinCount);
				expect(new Set(exercise.groups).size).toBe(exercise.groups.length);
				for (const options of PLACES) {
					expect(warmUp.filter((group) => options.includes(group))).toHaveLength(1);
				}
				// The same length, within the slack of the rules, and only learned keys.
				expect(Math.abs(lengthOf(warmUp) - written)).toBeLessThanOrEqual(RULES.warmUpReserveSlack);
				const learned = new Set(learnedChars(progression, 'fr.lesson.dot'));
				for (const char of exercise.groups.flatMap((group) => toGraphemes(group))) {
					expect(learned.has(char)).toBe(true);
				}
				expect(exercise.groups.length).toBeLessThanOrEqual(8);
				expect(generate(progression, 'dot', seed)).toEqual(exercise);
			}),
			{ numRuns: 200 }
		);
	});

	it('seldom opens two exercises with the same group', () => {
		const firsts = RUNS.map((seed) => generate(DRAWN, 'dot', seed).groups[0] as string);
		expect(new Set(firsts).size).toBeGreaterThanOrEqual(5);
		expect(topShare(firsts)).toBeLessThan(0.5);
	});
});

describe('warm-up made of words near the best ones', () => {
	const NEAR = progressionOf(undefined, {
		wordWarmUp: { minWords: 1, maxWordLength: 6, scoreShare: 0.6 }
	});

	it('still asks each new character the minimum number of times, with words that hold it', () => {
		fc.assert(
			fc.property(SEEDS, (seed) => {
				const exercise = generate(NEAR, 'ei', seed);
				for (const char of ['e', 'i']) {
					expect(countOf(exercise.groups, char)).toBeGreaterThanOrEqual(RULES.newCharMinCount);
				}
				for (const part of exercise.groups.flatMap((group) => group.split(SPACE))) {
					expect(WORD_TEXTS).toContain(part);
				}
				const parts = exercise.groups.flatMap((group) => group.split(SPACE));
				parts.forEach((part, index) => {
					if (index > 0) expect(part).not.toBe(parts[index - 1]);
				});
				expect(generate(NEAR, 'ei', seed)).toEqual(exercise);
			}),
			{ numRuns: 200 }
		);
	});

	it('opens with more different groups than the best words alone, at about the same length', () => {
		const measure = (progression: ProgressionDefinition) => {
			const exercises = RUNS.map((seed) => generate(progression, 'ei', seed).groups);
			const firsts = exercises.map((groups) => groups[0] as string);
			const length = exercises.reduce((sum, groups) => sum + lengthOf(groups), 0) / RUNS.length;
			return { distinct: new Set(firsts).size, top: topShare(firsts), length };
		};
		const best = measure(FIXED);
		const near = measure(NEAR);
		expect(near.distinct).toBeGreaterThan(best.distinct);
		expect(near.top).toBeLessThanOrEqual(0.35);
		expect(Math.abs(near.length - best.length)).toBeLessThanOrEqual(5);
	});

	it('puts two words side by side in a drawn order', () => {
		let newFirst = 0;
		let pairs = 0;
		for (const seed of RUNS) {
			const parts = (generate(FIXED, 'ei', seed).groups[0] as string).split(SPACE);
			if (parts.length !== 2) continue;
			pairs += 1;
			// The word drawn for « e » comes first or second.
			if ((parts[0] as string).includes('e') && !(parts[0] as string).includes('i')) newFirst += 1;
		}
		expect(pairs).toBeGreaterThan(20);
		expect(newFirst).toBeGreaterThan(pairs * 0.25);
		expect(newFirst).toBeLessThan(pairs * 0.75);
	});

	it('prefers two words of the same level side by side', () => {
		const levels = new Map<string, 1 | 2>([
			['de', 1],
			['je', 1],
			['si', 1],
			['le', 2],
			['se', 2],
			['il', 2]
		]);
		const words = wordsOf([...levels.entries()]);
		let pairs = 0;
		for (const seed of RUNS) {
			const parts = (generate(FIXED, 'ei', seed, { words }).groups[0] as string).split(SPACE);
			expect(parts).toHaveLength(2);
			pairs += 1;
			expect(levels.get(parts[0] as string), parts.join(' ')).toBe(levels.get(parts[1] as string));
		}
		expect(pairs).toBe(RUNS.length);
	});
});
