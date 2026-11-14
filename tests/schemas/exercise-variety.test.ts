import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	parsePhraseBank,
	parseTextBank,
	parseWordBank
} from '../../src/lib/engine/progression/banks';
import { parseProgression } from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import type { LessonDefinition, WorldDefinition } from '../../src/lib/engine/progression/types';
import { wordLimits } from '../../src/lib/engine/progression/word-limits';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/**
 * A varied practice in a stable frame, over the shipped content: an exercise keeps its guarantees
 * and its length, but two exercises of a lesson seldom open with the same group.
 */

const PLAYS = 200;
/** Share of the exercises of a lesson that may open with the same group (wide bound). */
const MAX_SAME_OPENING = 0.5;
/**
 * Lessons whose bank leaves little choice: « où » is the only word with « ù », and « ça » the only
 * short one with « ç », so an exercise opens with one or the other.
 */
const NARROW_BANK = new Map([['fr.lesson.comete-cedille-u-grave', 0.75]]);

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

/** The exercises of 200 plays of a lesson by a child of 8 or 9, one seed each. */
function playsOf(world: WorldDefinition, lesson: LessonDefinition): string[][] {
	return Array.from({ length: PLAYS }, (_, seed) => {
		const attempts = seed % 4;
		const played = { bestAccuracy: 90, stars: 2, attempts, lastPlayedAt: 0 } as const;
		const context = {
			words,
			phrases,
			texts,
			themeId: world.themeId,
			ageBand: '8-9' as const,
			...wordLimits(PLAY_RULES, progression, lesson.id, '8-9'),
			progress: { lessons: attempts === 0 ? {} : { [lesson.id]: played }, chars: {} }
		};
		const exercise = generateExercise(progression, lesson.id, seededRng(seed), context);
		// The same exercise for the same seed.
		if (seed % 20 === 0) {
			expect(generateExercise(progression, lesson.id, seededRng(seed), context)).toEqual(exercise);
		}
		return [...exercise.groups];
	});
}

function countOf(groups: readonly string[], matches: (char: string) => boolean): number {
	return groups.flatMap((group) => toGraphemes(group)).filter(matches).length;
}

function lengthOf(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

function topShare(values: readonly string[]): number {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return Math.max(...counts.values()) / values.length;
}

const writtenLessons = entries.filter(({ lesson }) => lesson.warmUp !== undefined);
const wordLessons = entries.filter(
	({ lesson }, index) => index >= 4 && lesson.warmUp === undefined && lesson.newChars.length > 0
);

describe('warm-ups written by hand, drawn from their reserve', () => {
	it.each(writtenLessons.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		`%s keeps its guarantees and varies over ${PLAYS} plays`,
		(_id, world, lesson) => {
			const written = lesson.warmUp ?? [];
			const reserve = lesson.warmUpReserve;
			expect(reserve).toBeDefined();
			const places = written.map((group, place) => [
				group,
				...(reserve?.alternatives?.[place] ?? [])
			]);
			const minimum = rules.writtenWarmUpMinCount ?? rules.newCharMinCount;
			const slack = rules.warmUpReserveSlack ?? 0;
			const exercises = playsOf(world, lesson);

			for (const groups of exercises) {
				const warmUp = groups.slice(0, written.length);
				const shown = groups.join(' | ');
				// One group for each place, none twice in the exercise.
				for (const options of places) {
					expect(
						warmUp.filter((group) => options.includes(group)),
						shown
					).toHaveLength(1);
				}
				expect(new Set(groups).size, shown).toBe(groups.length);
				// The same guarantees as the warm-up as written.
				for (const char of lesson.newChars) {
					expect(
						countOf(warmUp, (c) => c === char),
						shown
					).toBeGreaterThanOrEqual(minimum);
				}
				if (lesson.unlocks.includes('uppercase')) {
					expect(
						countOf(groups, (c) => /\p{Lu}/u.test(c)),
						shown
					).toBeGreaterThanOrEqual(rules.uppercaseMinCount ?? 0);
				}
				// The same length, within the slack of the rules.
				expect(Math.abs(lengthOf(warmUp) - lengthOf(written)), shown).toBeLessThanOrEqual(slack);
				expect(groups.length).toBeLessThanOrEqual(lesson.groupCount);
			}

			const firsts = exercises.map((groups) => groups[0] as string);
			const orders = new Set(exercises.map((groups) => groups.slice(0, written.length).join('|')));
			if (reserve?.keepFirst === true) {
				// Digits and @: the series already validated, the first one first, the others in turn.
				expect(new Set(firsts)).toEqual(new Set([written[0]]));
				expect(orders.size).toBeGreaterThanOrEqual(written.length);
			} else {
				expect(new Set(firsts).size).toBeGreaterThanOrEqual(5);
				expect(topShare(firsts)).toBeLessThanOrEqual(0.35);
				expect(orders.size).toBeGreaterThanOrEqual(10);
			}
		},
		60_000
	);
});

describe('warm-ups made of words', () => {
	it.each(wordLessons.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		`%s seldom opens two exercises with the same group over ${PLAYS} plays`,
		(id, world, lesson) => {
			const exercises = playsOf(world, lesson);
			for (const groups of exercises) {
				for (const char of lesson.newChars) {
					expect(
						countOf(groups, (c) => c === char),
						groups.join(' | ')
					).toBeGreaterThanOrEqual(rules.newCharMinCount);
				}
			}
			const firsts = exercises.map((groups) => groups[0] as string);
			const repeated = firsts.filter((group, index) => group === firsts[index - 1]).length;
			const bound = NARROW_BANK.get(id) ?? MAX_SAME_OPENING;
			expect(topShare(firsts), `most frequent opening of ${id}`).toBeLessThanOrEqual(bound);
			expect(repeated / (PLAYS - 1), `same opening twice in a row, ${id}`).toBeLessThanOrEqual(
				bound
			);
			expect(new Set(firsts).size).toBeGreaterThanOrEqual(2);
		},
		60_000
	);

	it('covers the lessons of letters, from the first words to the list typed with Enter', () => {
		expect(wordLessons.map(({ lesson }) => lesson.newChars.join(''))).toEqual([
			'ei',
			'ru',
			'tn',
			'ao',
			'qm',
			'cp',
			"é'",
			'gh',
			'vb',
			'yx',
			'zw',
			'èà',
			'çù',
			'\n'
		]);
	});
});
