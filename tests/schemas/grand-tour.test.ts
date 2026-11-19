import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	AGE_BANDS,
	parsePhraseBank,
	parseWordBank,
	usablePhrases,
	usableWords
} from '../../src/lib/engine/progression/banks';
import {
	isDetour,
	learnedChars,
	parseProgression
} from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { isLessonPassed, isLessonUnlocked } from '../../src/lib/engine/progression/progress';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import { tourKeys, writtenGroupsOf } from '../../src/lib/engine/progression/tour';
import type {
	AgeBand,
	CharProgress,
	LessonDefinition,
	ProgressState,
	StarCount,
	WorldDefinition
} from '../../src/lib/engine/progression/types';
import { wordLimits } from '../../src/lib/engine/progression/word-limits';
import { completePhrase } from '../../src/lib/engine/progression/word-practice';
import {
	ownedRewards,
	parseRewardCatalogue,
	unlockedRewards,
	withNewlyEarned
} from '../../src/lib/engine/rewards';
import { focusLessonId } from '../../src/routes/jouer/map';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

/*
 * The grand tours over the shipped content (ADR-075, choice 3): words and phrases of what the child
 * knows at the end of each world, the keys of the world it types badly more often, and nothing
 * that a child already on the way would lose.
 */

const SEEDS = 200;

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const raw = readJson('content/fr/progression/azerty-decouverte.json') as {
	worlds: { lessons: { tour?: unknown }[] }[];
};
const progression = parseProgression(raw);
const catalogueData = readJson('content/fr/rewards/azerty-decouverte.json') as {
	rewards: { condition: { kind: string } }[];
};
const catalogue = parseRewardCatalogue(catalogueData);
const words = parseWordBank(readJson('content/fr/words/base.json'));
const phrases = parsePhraseBank(readJson('content/fr/phrases/base.json'));
const { rules } = progression;
const tourRules = rules.tour;
if (tourRules === undefined) throw new Error('no rules for the grand tours');

/** The course as it was before the grand tours, and its rewards: what children played until now. */
const before = parseProgression({
	...raw,
	worlds: raw.worlds.map((world) => ({
		...world,
		lessons: world.lessons.filter((lesson) => lesson.tour === undefined)
	}))
});
const catalogueBefore = parseRewardCatalogue({
	...catalogueData,
	rewards: catalogueData.rewards.filter((reward) => reward.condition.kind !== 'tour-mastered')
});

const lessons = progression.worlds.flatMap((world) => world.lessons);
const way = lessons.filter((lesson) => !isDetour(lesson));
const tours = progression.worlds.flatMap((world) =>
	world.lessons.filter((lesson) => lesson.tour !== undefined).map((tour) => ({ world, tour }))
);

const PASSED = { bestAccuracy: 92, stars: 2 as StarCount, attempts: 1, lastPlayedAt: 1 };

function charsOf(entries: Readonly<Record<string, [number, number]>>): ProgressState['chars'] {
	return Object.fromEntries(
		Object.entries(entries).map(([char, [attempts, errors]]): [string, CharProgress] => [
			char,
			{ attempts, errors, recent: [{ attempts, errors, latencyMs: null }] }
		])
	);
}

/**
 * A child at the end of the world of the tour: every lesson on the way up to it passed, every key
 * learned acquired, but `weak`, typed wrong 4 times in 10.
 */
function childAt(tour: LessonDefinition, weak: readonly string[]): ProgressState {
	const index = way.findIndex((lesson) => lessons.indexOf(lesson) > lessons.indexOf(tour));
	const passed = (index < 0 ? way : way.slice(0, index)).map((lesson) => lesson.id);
	const learned = learnedChars(progression, tour.id);
	return {
		lessons: Object.fromEntries(passed.map((id) => [id, PASSED])),
		chars: charsOf(
			Object.fromEntries(
				learned.map((char) => [char, weak.includes(char) ? [30, 12] : [30, 0]] as const)
			)
		)
	};
}

/** The keys of the world whose weakness is measured: its first ones, the space aside. */
function weakKeysOf(tour: LessonDefinition, count: number): string[] {
	return tourKeys(progression, childAt(tour, []), tour.id)
		.filter((char) => char !== ' ')
		.slice(0, count);
}

function tourExercise(
	world: WorldDefinition,
	tour: LessonDefinition,
	ageBand: AgeBand,
	progress: ProgressState,
	seed: number
) {
	return generateExercise(progression, tour.id, seededRng(seed), {
		words,
		phrases,
		progress,
		themeId: world.themeId,
		ageBand,
		...wordLimits(PLAY_RULES, progression, tour.id, ageBand)
	});
}

/** A whole sentence: several words, a capital first, a mark that ends a sentence last. */
function isSentence(text: string): boolean {
	return /^\p{Lu}/u.test(text) && text.includes(' ') && !/[\p{L}\p{N}\n]$/u.test(text);
}

function countIn(groups: readonly string[], chars: readonly string[]): number {
	return groups.flatMap((group) => toGraphemes(group)).filter((char) => chars.includes(char))
		.length;
}

describe.each(tours.map(({ world, tour }) => [tour.id, world, tour] as const))(
	'the grand tour %s',
	(_id, world, tour) => {
		const keys = tourKeys(progression, childAt(tour, []), tour.id);
		const profiles = [
			['no weak key', [] as string[]],
			['one weak key', weakKeysOf(tour, 1)],
			['several weak keys', weakKeysOf(tour, 3)]
		] as const;

		it.each(AGE_BANDS)(
			`asks words and phrases of what the child knows only, enough keys of the world, a whole sentence once there are some, the same each time, over ${SEEDS} seeds (%s)`,
			(ageBand) => {
				const known = new Set(learnedChars(progression, tour.id));
				const limits = wordLimits(PLAY_RULES, progression, tour.id, ageBand);
				const usable = new Set([
					...tour.words,
					...usableWords(words, [...known], { ...limits, ageBand }).map((entry) => entry.text)
				]);
				const bankPhrases = usablePhrases(phrases, [...known], {
					maxLevel: limits.maxLevel,
					ageBand
				}).map((phrase) => completePhrase(phrase.text, known, rules.phraseEnd ?? '.'));
				// A phrase of the bank, or a warm-up written by hand for a lesson of the world.
				const whole = new Set([...bankPhrases, ...writtenGroupsOf(progression, tour, known)]);
				// Once the bank has whole sentences there, a tour holds one, like any play (F1).
				const sentences = new Set(tour.mix.phrases > 0 ? bankPhrases.filter(isSentence) : []);
				const mostGroups = Math.max(tour.groupCount, rules.maxGroupCount ?? 0);
				for (const [, weak] of profiles) {
					const progress = childAt(tour, weak);
					for (let seed = 0; seed < SEEDS; seed++) {
						const { groups } = tourExercise(world, tour, ageBand, progress, seed);
						const shown = groups.join(' | ');
						expect(groups.length, shown).toBeGreaterThan(0);
						expect(groups.length, shown).toBeLessThanOrEqual(mostGroups);
						groups.forEach((group, i) => {
							for (const char of toGraphemes(group)) expect(known.has(char), shown).toBe(true);
							// Never a suite: a phrase of the bank, or words side by side.
							const made = whole.has(group) || group.split(' ').every((part) => usable.has(part));
							expect(made, `${group} in ${shown}`).toBe(true);
							expect(group, shown).toMatch(/^\S+( \S+)*$/u);
							expect(group, shown).not.toBe(groups[i - 1]);
						});
						expect(countIn(groups, keys), shown).toBeGreaterThanOrEqual(
							tourRules.minWorldKeystrokes
						);
						if (sentences.size > 0) {
							expect(
								groups.filter((group) => sentences.has(group)).length,
								shown
							).toBeGreaterThanOrEqual(rules.wholePhraseMinCount ?? 0);
						}
						if (seed % 20 === 0) {
							expect(tourExercise(world, tour, ageBand, progress, seed).groups).toEqual(groups);
						}
					}
				}
			},
			120_000
		);

		it.each(AGE_BANDS)(
			`asks the keys of the world the child types badly more often than when they are mastered (%s)`,
			(ageBand) => {
				for (const [name, weak] of profiles.slice(1)) {
					const total = (progress: ProgressState) =>
						Array.from({ length: SEEDS }, (_, seed) =>
							countIn(tourExercise(world, tour, ageBand, progress, seed).groups, weak)
						).reduce((sum, count) => sum + count, 0);
					const mastered = total(childAt(tour, []));
					const typedBadly = total(childAt(tour, weak));
					expect(typedBadly, `${name}: ${weak.join(' ')}`).toBeGreaterThan(mastered);
				}
			},
			120_000
		);

		it('asks every key of the world of a child who masters them all', () => {
			const progress = childAt(tour, []);
			const asked = new Set(
				Array.from({ length: SEEDS }, (_, seed) =>
					tourExercise(world, tour, '8-9', progress, seed).groups.flatMap((group) =>
						toGraphemes(group)
					)
				).flat()
			);
			expect(keys.filter((char) => !asked.has(char))).toEqual([]);
		});
	}
);

describe('a child already on the way when the grand tours come', () => {
	const ids = before.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.id));
	const accuracyArb = fc.oneof(
		fc.constant(null),
		fc.double({ min: 0, max: 100, noNaN: true }),
		fc.constantFrom(79.9, 80, 90, 95, 100)
	);
	const progressArb = fc
		.record({
			accuracies: fc.array(accuracyArb, { minLength: ids.length, maxLength: ids.length }),
			chars: fc.dictionary(
				fc.constantFrom(...learnedChars(before, ids.at(-1) ?? '')),
				fc.tuple(fc.integer({ min: 1, max: 30 }), fc.integer({ min: 0, max: 30 }))
			)
		})
		.map(({ accuracies, chars }): ProgressState => {
			const played = ids.flatMap((id, index) => {
				const accuracy = accuracies[index] ?? null;
				if (accuracy === null) return [];
				const stars = rules.starThresholds.filter((threshold) => accuracy >= threshold).length;
				return [
					[id, { bestAccuracy: accuracy, stars: stars as StarCount, attempts: 1, lastPlayedAt: 1 }]
				] as const;
			});
			const bounded = Object.fromEntries(
				Object.entries(chars).map(([char, [attempts, errors]]) => [
					char,
					[attempts, Math.min(errors, attempts)] as [number, number]
				])
			);
			return { lessons: Object.fromEntries(played), chars: charsOf(bounded) };
		});
	const openedArb = fc.subarray(progression.worlds.map((world) => world.id));
	const keptArb = fc.subarray(ids, { maxLength: 3 });

	it('keeps open every lesson it had open, and every reward it had', () => {
		fc.assert(
			fc.property(progressArb, openedArb, keptArb, (progress, opened, kept) => {
				for (const id of ids) {
					if (isLessonUnlocked(before, progress, id, opened, kept)) {
						expect(isLessonUnlocked(progression, progress, id, opened, kept), id).toBe(true);
					}
				}
				const earned = withNewlyEarned(catalogueBefore, before, progress, []);
				const owned = ownedRewards(catalogue, progression, progress, earned);
				for (const id of ownedRewards(catalogueBefore, before, progress, earned)) {
					expect(owned.has(id), id).toBe(true);
				}
				for (const id of unlockedRewards(catalogueBefore, before, progress)) {
					expect(unlockedRewards(catalogue, progression, progress).has(id), id).toBe(true);
				}
			})
		);
	});

	it('always has a lesson on the way to play until the way is finished, never a tour', () => {
		fc.assert(
			fc.property(progressArb, openedArb, keptArb, (progress, opened, kept) => {
				const focus = focusLessonId(progression, progress, opened, kept);
				expect(focus).toBe(focusLessonId(before, progress, opened, kept));
				const left = way.filter((lesson) => !isLessonPassed(rules, progress, lesson.id));
				if (left.length === 0) return;
				expect(
					left.some((lesson) => isLessonUnlocked(progression, progress, lesson.id, opened, kept))
				).toBe(true);
				expect(tours.some(({ tour }) => tour.id === focus)).toBe(false);
			})
		);
	});

	it('finds the tours of the worlds it went through open, the others closed', () => {
		fc.assert(
			fc.property(progressArb, openedArb, keptArb, (progress, opened, kept) => {
				for (const { world, tour } of tours) {
					const onTheWay = world.lessons.filter((lesson) => !isDetour(lesson));
					const finished = isLessonPassed(rules, progress, onTheWay.at(-1)?.id ?? '');
					expect(isLessonUnlocked(progression, progress, tour.id, opened, kept), tour.id).toBe(
						finished
					);
				}
			})
		);
	});
});
