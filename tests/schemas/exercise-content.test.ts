import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	AGE_BANDS,
	lessonTexts,
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	storyPhrases,
	textGroups,
	usablePhrases,
	usableWords
} from '../../src/lib/engine/progression/banks';
import { learnedChars, parseProgression } from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import type {
	AgeBand,
	Exercise,
	ExerciseContext,
	LessonDefinition,
	ProgressState,
	WorldDefinition
} from '../../src/lib/engine/progression/types';
import { wordLimits } from '../../src/lib/engine/progression/word-limits';
import { completePhrase } from '../../src/lib/engine/progression/word-practice';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/**
 * What the child types, over the shipped content and as the game draws it (audit of pedagogy,
 * P-04, P-05, P-08, P-22): real words, real capitals, and the weak keys again.
 */

const SPACE = ' ';
const LINE_BREAK = String.fromCharCode(10);
/** Share of the characters of an exercise that may be neither a word, a phrase nor a text. */
const MAX_SUITE_SHARE = 0.15;
const RUNS = 8;
const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const BANDS = fc.constantFrom<AgeBand>(...AGE_BANDS);

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const progression = parseProgression(readJson('content/fr/progression/azerty-decouverte.json'));
const words = parseWordBank(readJson('content/fr/words/base.json'));
const phrases = parsePhraseBank(readJson('content/fr/phrases/base.json'));
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
const { rules } = progression;
const entries = progression.worlds.flatMap((world) =>
	world.lessons.map((lesson) => ({ world, lesson }))
);

function contextOf(
	world: WorldDefinition,
	lesson: LessonDefinition,
	ageBand: AgeBand,
	plays: number,
	chars: ProgressState['chars'] = {}
): ExerciseContext {
	const played = { bestAccuracy: 90, stars: 2, attempts: plays, lastPlayedAt: 0 } as const;
	return {
		words,
		phrases,
		texts,
		themeId: world.themeId,
		ageBand,
		...wordLimits(PLAY_RULES, progression, lesson.id, ageBand),
		progress: { lessons: plays === 0 ? {} : { [lesson.id]: played }, chars }
	};
}

/** The words a lesson can draw for an age group: its own and those of the bank, as limited. */
function wordsOf(lesson: LessonDefinition, ageBand: AgeBand): Set<string> {
	const limits = wordLimits(PLAY_RULES, progression, lesson.id, ageBand);
	const options = { maxLevel: limits.maxLevel, maxWordLength: limits.maxWordLength, ageBand };
	return new Set([
		...lesson.words,
		...usableWords(words, learnedChars(progression, lesson.id), options).map((entry) => entry.text)
	]);
}

function lower(part: string): string {
	const [first = '', ...rest] = toGraphemes(part);
	return `${first.toLowerCase()}${rest.join('')}`;
}

interface Sorted {
	/** Characters of the exercise. */
	readonly total: number;
	/** Characters that are neither in a word, a phrase, a text nor a warm-up written by hand. */
	readonly suite: number;
	/** The parts of groups that are suites. */
	readonly suites: readonly string[];
}

/** Every group the warm-up written for a lesson can hold: those written and their alternatives. */
function writtenOf(lesson: LessonDefinition): string[] {
	return [...(lesson.warmUp ?? []), ...(lesson.warmUpReserve?.alternatives ?? []).flat()];
}

function sort(lesson: LessonDefinition, ageBand: AgeBand, exercise: Exercise): Sorted {
	const usable = wordsOf(lesson, ageBand);
	const isWord = (part: string) => usable.has(part) || usable.has(lower(part));
	const learned = new Set(learnedChars(progression, lesson.id));
	const limits = wordLimits(PLAY_RULES, progression, lesson.id, ageBand);
	const whole = new Set<string>([
		...writtenOf(lesson),
		...storyPhrases(phrases, lesson.id, ageBand).map((phrase) => phrase.text),
		...lessonTexts(texts, lesson.id, ageBand).flatMap((entry) =>
			textGroups(entry, rules.textGroupLength)
		),
		...usablePhrases(phrases, learned, { maxLevel: limits.maxLevel, ageBand }).map((phrase) =>
			rules.phraseEnd === undefined
				? phrase.text
				: completePhrase(phrase.text, learned, rules.phraseEnd)
		)
	]);
	let total = 0;
	const suites: string[] = [];
	for (const group of exercise.groups) {
		total += toGraphemes(group).length;
		if (whole.has(group)) continue;
		// A line of a list: a word, then Enter.
		const line = group.endsWith(LINE_BREAK) ? group.slice(0, -1) : group;
		const others = line.split(SPACE).filter((part) => !isWord(part));
		if (others.length > 0) suites.push(others.join(SPACE));
	}
	const suite = suites.reduce((sum, part) => sum + toGraphemes(part).length, 0);
	return { total, suite, suites };
}

describe('what the child types, over the shipped content', () => {
	it('ships the rules of the lot: words to warm up, shapes of suites, capitals, weak keys', () => {
		expect(rules.wordWarmUp).toBeDefined();
		expect(rules.drillPatterns).toBeDefined();
		expect(rules.suiteFreeMinWords).toBeGreaterThan(0);
		expect(rules.uppercaseMinCount).toBeGreaterThanOrEqual(10);
		expect(rules.weakChars).toEqual({
			minCount: 4,
			maxChars: 2,
			minAttempts: 5,
			minErrorRate: 0.2
		});
		expect(rules.phraseEnd).toBe('.');
	});

	it('has enough words to do without suites from the eighth lesson, for every age group', () => {
		const enough = rules.suiteFreeMinWords ?? Number.POSITIVE_INFINITY;
		for (const ageBand of AGE_BANDS) {
			const counts = entries.map(({ lesson }) => wordsOf(lesson, ageBand).size);
			counts.slice(0, 4).forEach((count) => expect(count).toBe(0));
			counts.slice(7).forEach((count, index) => {
				expect(count, `lesson ${index + 8}, ${ageBand}`).toBeGreaterThanOrEqual(enough);
			});
		}
	});

	it.each(
		entries.map(({ world, lesson }, index) => [lesson.id, index + 1, world, lesson] as const)
	)(
		'%s (lesson %i): only learned keys, the same each time, suites without capital and never marks alone',
		(_id, _number, world, lesson) => {
			const learned = new Set(learnedChars(progression, lesson.id));
			const enough = rules.suiteFreeMinWords ?? Number.POSITIVE_INFINITY;
			fc.assert(
				fc.property(SEEDS, BANDS, fc.integer({ min: 0, max: 3 }), (seed, ageBand, plays) => {
					const context = contextOf(world, lesson, ageBand, plays);
					const exercise = generateExercise(progression, lesson.id, seededRng(seed), context);
					const shown = exercise.groups.join(' | ');
					expect(generateExercise(progression, lesson.id, seededRng(seed), context)).toEqual(
						exercise
					);
					expect(exercise.groups.length).toBeGreaterThan(0);
					expect(exercise.groups.length).toBeLessThanOrEqual(lesson.groupCount);
					exercise.groups.forEach((group, index) => {
						for (const char of toGraphemes(group)) expect(learned.has(char), shown).toBe(true);
						if (index > 0) expect(group, shown).not.toBe(exercise.groups[index - 1]);
					});
					const { total, suite, suites } = sort(lesson, ageBand, exercise);
					for (const part of suites) {
						expect(part, shown).not.toMatch(/\p{Lu}/u);
						expect(part, shown).toMatch(/[\p{L}\p{N}]/u);
					}
					// From the lesson where the bank is enough, nearly everything is a word or a phrase.
					if (wordsOf(lesson, ageBand).size >= enough) {
						expect(suite / total, shown).toBeLessThanOrEqual(MAX_SUITE_SHARE);
					}
				}),
				{ numRuns: RUNS }
			);
		},
		60_000
	);

	const capitalLessons = entries.filter(({ lesson }) => lesson.unlocks.includes('uppercase'));

	it.each(capitalLessons.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		'%s: every exercise holds the minimum of capitals (audit P-05)',
		(_id, world, lesson) => {
			const minimum = rules.uppercaseMinCount ?? 0;
			expect(minimum).toBeGreaterThan(0);
			fc.assert(
				fc.property(SEEDS, BANDS, fc.integer({ min: 0, max: 3 }), (seed, ageBand, plays) => {
					const context = contextOf(world, lesson, ageBand, plays);
					const { groups } = generateExercise(progression, lesson.id, seededRng(seed), context);
					const capitals = groups
						.flatMap((group) => toGraphemes(group))
						.filter((char) => /\p{Lu}/u.test(char));
					expect(capitals.length, groups.join(' | ')).toBeGreaterThanOrEqual(minimum);
				}),
				{ numRuns: 2 * RUNS }
			);
		},
		60_000
	);

	/** Lessons with words and without a text that takes the groups: the review always has room. */
	const reviewLessons = entries.filter(
		({ lesson }, index) => index >= 4 && lessonTexts(texts, lesson.id).length === 0
	);

	it.each(reviewLessons.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		'%s: every exercise holds each weak key at least the minimum number of times (audit P-08)',
		(_id, world, lesson) => {
			const weakRules = rules.weakChars;
			if (weakRules === undefined) throw new Error('no review of weak characters');
			const longest = rules.wordWarmUp?.maxWordLength ?? Number.POSITIVE_INFINITY;
			fc.assert(
				fc.property(
					SEEDS,
					BANDS,
					fc.integer({ min: 0, max: 3 }),
					fc.integer({ min: 0, max: 1000 }),
					(seed, ageBand, plays, pick) => {
						// Keys that at least two short words of the lesson hold.
						const holders = new Map<string, number>();
						for (const word of wordsOf(lesson, ageBand)) {
							const graphemes = toGraphemes(word);
							if (graphemes.length > longest) continue;
							for (const char of new Set(graphemes)) {
								holders.set(char, (holders.get(char) ?? 0) + 1);
							}
						}
						const eligible = [...holders].filter(([, count]) => count >= 2).map(([char]) => char);
						if (eligible.length < 2) return;
						const first = eligible[pick % eligible.length] as string;
						const second = eligible[(pick * 7 + 3) % eligible.length] as string;
						const sample = { attempts: 10, errors: 5, latencyMs: null };
						const chars = Object.fromEntries(
							[first, second].map((char) => [char, { attempts: 10, errors: 5, recent: [sample] }])
						);
						const context = contextOf(world, lesson, ageBand, plays, chars);
						const { groups } = generateExercise(progression, lesson.id, seededRng(seed), context);
						const typed = groups.flatMap((group) => toGraphemes(group));
						for (const char of [first, second]) {
							expect(
								typed.filter((grapheme) => grapheme === char).length,
								`"${char}" in ${groups.join(' | ')}`
							).toBeGreaterThanOrEqual(weakRules.minCount);
						}
						expect(groups.length).toBeLessThanOrEqual(lesson.groupCount);
					}
				),
				{ numRuns: RUNS }
			);
		},
		60_000
	);

	it('gives the early phrases their capital and their full stop once both are learned (audit P-22)', () => {
		const comma = entries.findIndex(({ lesson }) => lesson.newChars.includes('.'));
		expect(comma).toBeGreaterThan(0);
		for (const { world, lesson } of entries.slice(comma, comma + 6)) {
			const story = new Set(storyPhrases(phrases, lesson.id).map((phrase) => phrase.text));
			for (let seed = 1; seed <= 6; seed++) {
				const context = contextOf(world, lesson, '8-9', 1);
				const { groups } = generateExercise(progression, lesson.id, seededRng(seed), context);
				for (const group of groups) {
					const isSentence = group.split(SPACE).length >= 3 && !story.has(group);
					if (!isSentence || writtenOf(lesson).includes(group)) continue;
					expect(group, groups.join(' | ')).toMatch(/[.!?"]$/u);
					expect(group, groups.join(' | ')).not.toMatch(/^[a-z]/u);
				}
			}
		}
	});
});
