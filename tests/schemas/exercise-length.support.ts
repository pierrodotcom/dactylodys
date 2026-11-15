import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	lessonTexts,
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	usablePhrases,
	usableWords
} from '../../src/lib/engine/progression/banks';
import { learnedChars, parseProgression } from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { pacedTargetLength } from '../../src/lib/engine/progression/pace';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import type {
	AgeBand,
	ExerciseContext,
	LessonDefinition,
	WorldDefinition
} from '../../src/lib/engine/progression/types';
import { wordLimits } from '../../src/lib/engine/progression/word-limits';
import { completePhrase } from '../../src/lib/engine/progression/word-practice';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/**
 * Plays that last (ADR-075, choice 4), over the shipped content: an exercise grows with the pace
 * of the child, by words and phrases, and never loses what the lesson gives a beginner. Shared by
 * the two files of the age groups, which run side by side.
 */

export const PLAYS = 200;
/** Seeds on which the checks that draw an exercise once more are made: one in ten. */
const CHECKED_EVERY = 10;
const SPACE = ' ';
const LINE_BREAK = String.fromCharCode(10);
/** Correct characters per minute of a slow, a middling and a fast child. */
export const PACES = { slow: 15, medium: 40, fast: 70 } as const;
const PACE_NAMES = ['slow', 'medium', 'fast'] as const;
/** A word of this length or more never comes a third time in an exercise that grew. */
const MIN_COUNTED_WORD_LENGTH = 4;
/** Time given to the plays of one lesson for one age group, on a loaded machine. */
export const LESSON_TIMEOUT_MS = 120_000;

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

export const progression = parseProgression(
	readJson('content/fr/progression/azerty-decouverte.json')
);
const words = parseWordBank(readJson('content/fr/words/base.json'));
const phrases = parsePhraseBank(readJson('content/fr/phrases/base.json'));
const texts = parseTextBank(readJson('content/fr/texts/base.json'));
export const { rules } = progression;
export const entries = progression.worlds.flatMap((world) =>
	world.lessons.map((lesson) => ({ world, lesson }))
);
const ceiling = (rules.maxTargetLength ?? 0) + (rules.lengthSlack ?? 0);
export const maxGroups = rules.maxGroupCount ?? 0;
/** Index of the lesson of the full stop: from it on, phrases are whole. */
export const firstWhole = entries.findIndex(({ lesson }) =>
	lesson.newChars.includes(rules.phraseEnd ?? '')
);

/** Paces of the latest plays of a child who always types at `pace`. */
export function steady(pace: number): number[] {
	return Array.from({ length: rules.paceRecentPlays ?? 0 }, () => pace);
}

export function contextOf(
	world: WorldDefinition,
	lesson: LessonDefinition,
	ageBand: AgeBand,
	seed: number,
	paces?: readonly number[]
): ExerciseContext {
	const attempts = seed % 4;
	const played = { bestAccuracy: 90, stars: 2, attempts, lastPlayedAt: 0 } as const;
	return {
		words,
		phrases,
		texts,
		themeId: world.themeId,
		ageBand,
		...wordLimits(PLAY_RULES, progression, lesson.id, ageBand),
		progress: { lessons: attempts === 0 ? {} : { [lesson.id]: played }, chars: {} },
		...(paces === undefined ? {} : { paces })
	};
}

export function lengthOf(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

/** The groups of `longer` that are not those of `shorter`, when `shorter` is kept in order. */
function addedTo(shorter: readonly string[], longer: readonly string[]): string[] | undefined {
	const added: string[] = [];
	let next = 0;
	for (const group of longer) {
		if (group === shorter[next]) next += 1;
		else added.push(group);
	}
	return next === shorter.length ? added : undefined;
}

function wordsAsWritten(group: string): string[] {
	return group
		.split(/\s+/u)
		.map((token) => token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
		.filter((word) => word !== '');
}

export function isWhole(group: string): boolean {
	return (
		/^\p{Lu}/u.test(group) &&
		group.includes(SPACE) &&
		!group.endsWith(LINE_BREAK) &&
		!/[\p{L}\p{N}]$/u.test(group)
	);
}

/**
 * Checks the plays of one lesson for one age group over `PLAYS` seeds and the three paces; `number`
 * is the place of the lesson in the progression, from 1.
 */
export function checkPlaysThatLast(
	ageBand: AgeBand,
	world: WorldDefinition,
	lesson: LessonDefinition,
	number: number
): void {
	const learned = new Set(learnedChars(progression, lesson.id));
	const limits = wordLimits(PLAY_RULES, progression, lesson.id, ageBand);
	const usable = new Set([
		...lesson.words,
		...usableWords(words, [...learned], { ...limits, ageBand }).map((entry) => entry.text)
	]);
	const whole = new Set(
		usablePhrases(phrases, [...learned], { maxLevel: limits.maxLevel, ageBand }).map((phrase) =>
			rules.phraseEnd === undefined
				? phrase.text
				: completePhrase(phrase.text, learned, rules.phraseEnd)
		)
	);
	const hasText = lessonTexts(texts, lesson.id, ageBand).length > 0;
	const grows = (name: (typeof PACE_NAMES)[number]) =>
		pacedTargetLength(rules, lesson, steady(PACES[name])) > lesson.targetLength;
	const totals = { base: 0, slow: 0, medium: 0, fast: 0 };

	for (let seed = 0; seed < PLAYS; seed++) {
		const checked = seed % CHECKED_EVERY === 0;
		const draw = (paces?: readonly number[]) =>
			generateExercise(
				progression,
				lesson.id,
				seededRng(seed),
				contextOf(world, lesson, ageBand, seed, paces)
			);
		const base = draw();
		const shown = base.groups.join(' | ');
		totals.base += lengthOf(base.groups);

		if (checked) {
			// A beginner, with fewer plays than the rules ask, has the exercise of the lesson.
			expect(draw([PACES.fast, PACES.fast])).toEqual(base);
			expect(draw([])).toEqual(base);
		}

		// From the lesson of the full stop, a whole phrase, or the text that ends the exercise.
		if (number > firstWhole && lesson.mix.phrases > 0 && !hasText) {
			expect(base.groups.some(isWhole), shown).toBe(true);
		}

		let before = base.groups;
		for (const name of PACE_NAMES) {
			// An aim no longer than the lesson leaves its exercise as it is: drawn on some seeds only.
			if (!grows(name) && !checked) {
				totals[name] += lengthOf(base.groups);
				continue;
			}
			const paces = steady(PACES[name]);
			const paced = draw(paces);
			const groups = paced.groups;
			const told = `${name}: ${groups.join(' | ')}`;
			totals[name] += lengthOf(groups);

			if (!grows(name)) expect(paced, told).toEqual(base);
			// The same exercise for the same seed.
			if (checked) expect(draw(paces)).toEqual(paced);

			// Everything a slower child gets is kept, in order: only groups are added, so the warm-up
			// and the strokes asked of the new characters stay too.
			const added = addedTo(before, groups);
			expect(added, told).toBeDefined();
			expect(addedTo(base.groups, groups), told).toBeDefined();
			expect(lengthOf(groups)).toBeGreaterThanOrEqual(lengthOf(before));
			expect(lengthOf(groups)).toBeLessThanOrEqual(Math.max(lengthOf(base.groups), ceiling));
			expect(groups.length).toBeLessThanOrEqual(Math.max(base.groups.length, maxGroups));

			groups.forEach((group, index) => {
				for (const char of toGraphemes(group)) expect(learned.has(char), told).toBe(true);
				if (index > 0) expect(group, told).not.toBe(groups[index - 1]);
			});

			// What is added is a phrase of the bank, or words of the lesson side by side.
			for (const group of added ?? []) {
				const made = whole.has(group) || group.split(SPACE).every((part) => usable.has(part));
				expect(made, `${group} in ${told}`).toBe(true);
			}

			// No word of an exercise that grew comes a third time.
			if (groups.length > base.groups.length) {
				const counts = new Map<string, number>();
				for (const word of groups.flatMap(wordsAsWritten)) {
					if (toGraphemes(word).length < MIN_COUNTED_WORD_LENGTH || !usable.has(word)) continue;
					counts.set(word, (counts.get(word) ?? 0) + 1);
				}
				const baseCounts = new Map<string, number>();
				for (const word of base.groups.flatMap(wordsAsWritten)) {
					baseCounts.set(word, (baseCounts.get(word) ?? 0) + 1);
				}
				for (const [word, count] of counts) {
					// Only what the lesson itself repeats may come more than twice.
					expect(count, `${word} in ${told}`).toBeLessThanOrEqual(
						Math.max(2, baseCounts.get(word) ?? 0)
					);
				}
			}
			before = groups;
		}
	}

	// A slow child keeps the exercise of the lesson; the mean never goes down with the pace.
	if (!grows('slow')) expect(totals.slow).toBe(totals.base);
	expect(totals.slow).toBeGreaterThanOrEqual(totals.base);
	expect(totals.medium).toBeGreaterThanOrEqual(totals.slow);
	expect(totals.fast).toBeGreaterThanOrEqual(totals.medium);
	// Where the lesson has words to add, a fast child types more than the lesson alone gives.
	if (lesson.mix.words + lesson.mix.phrases > 0 && usable.size > 0) {
		expect(totals.fast).toBeGreaterThan(totals.base);
	}
}
