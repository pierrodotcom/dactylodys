import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseProgression, wayCharsOfWorld } from '../progression/definition';
import { charMastery } from '../progression/mastery';
import { emptyProgress, isLessonPassed } from '../progression/progress';
import type { CharProgress, ProgressState } from '../progression/types';
import {
	ownedRewards,
	parseRewardCatalogue,
	rewardsOfLesson,
	unlockedRewards,
	validateRewardCatalogue,
	withNewlyEarned
} from './index';

/*
 * The reward of a grand tour (ADR-075, choice 3): won by passing the tour of a world with every
 * key of that world acquired, as the adult's report reads it; announced beforehand, never drawn,
 * never taken back.
 */

const WORLD = 'fr.world.one';
const FIRST = 'fr.lesson.first';
const SECOND = 'fr.lesson.second';
const DETOUR = 'fr.lesson.detour';
const TOUR = 'fr.lesson.tour';
const MASTERY = {
	acquiredMinAttempts: 20,
	acquiredMaxErrorRate: 0.1,
	fragileMinAttempts: 5,
	fragileMinErrorRate: 0.2
};

function lesson(id: string, newChars: string[], extra: Record<string, unknown> = {}) {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 0, words: 1, phrases: 0 },
		unlocks: [],
		groupCount: 5,
		targetLength: 20,
		groupLength: [3, 4],
		...extra
	};
}

const PROGRESSION = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.stamps',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 2,
		themeBoost: 0,
		newCharMinCount: 0,
		recentCharWindow: 30,
		keyboardFade: MASTERY,
		tour: {
			minWorldKeystrokes: 4,
			keyWeights: { acquired: 1, learning: 2, fragile: 3 },
			scoreShare: 0.6
		}
	},
	worlds: [
		{
			id: WORLD,
			title: 'One',
			themeId: 'general',
			gameIds: ['hatching'],
			lessons: [
				lesson(FIRST, ['f', 'j']),
				lesson(SECOND, [' ', 'd']),
				lesson(DETOUR, ['î'], { optional: true }),
				lesson(TOUR, [], { optional: true, tour: { worldId: WORLD } })
			]
		}
	]
});

const STAMP = 'fr.reward.stamp';
const CATALOGUE = parseRewardCatalogue({
	schemaVersion: 1,
	id: 'fr.rewards.stamps',
	locale: 'fr-FR',
	progressionId: PROGRESSION.id,
	colors: [{ id: 'green', title: 'Green' }],
	nameSuggestions: ['Pipo'],
	rewards: [
		{
			id: STAMP,
			kind: 'trophy',
			title: 'Le tampon',
			description: 'Réussis le grand tour, toutes ses touches apprivoisées.',
			artId: 'stamp-dinosaurs',
			condition: { kind: 'tour-mastered', lessonId: TOUR }
		}
	]
});

const KEYS = ['f', 'j', ' ', 'd'];
const PASSED = { bestAccuracy: 90, stars: 2, attempts: 1, lastPlayedAt: 0 } as const;

function progressOf(
	lessons: readonly string[],
	chars: Readonly<Record<string, [number, number]>>
): ProgressState {
	return {
		lessons: Object.fromEntries(lessons.map((id) => [id, PASSED])),
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, [attempts, errors]]): [string, CharProgress] => [
				char,
				{ attempts, errors, recent: [{ attempts, errors, latencyMs: null }] }
			])
		)
	};
}

const ALL_ACQUIRED = Object.fromEntries(KEYS.map((char) => [char, [30, 1] as [number, number]]));

describe('the reward of a grand tour', () => {
	it('reads a condition on a grand tour, and only on one', () => {
		expect(CATALOGUE.rewards[0]?.condition).toEqual({ kind: 'tour-mastered', lessonId: TOUR });
		expect(validateRewardCatalogue(CATALOGUE, PROGRESSION)).toEqual([]);
		const onLesson = parseRewardCatalogue({
			...CATALOGUE,
			rewards: [{ ...CATALOGUE.rewards[0], condition: { kind: 'tour-mastered', lessonId: FIRST } }]
		});
		expect(validateRewardCatalogue(onLesson, PROGRESSION)).toEqual([
			`rewards[0] (${STAMP}): lesson "${FIRST}" is not a grand tour`
		]);
		expect(() =>
			parseRewardCatalogue({
				...CATALOGUE,
				rewards: [
					{
						...CATALOGUE.rewards[0],
						condition: { kind: 'tour-mastered', lessonId: TOUR, plays: 3 }
					}
				]
			})
		).toThrow(/plays: unknown property/);
	});

	it('names the keys the world brings on the way, never those of a detour', () => {
		expect(wayCharsOfWorld(PROGRESSION, WORLD)).toEqual(KEYS);
	});

	it('is announced before the tour is played, on its screen', () => {
		expect(rewardsOfLesson(CATALOGUE, TOUR).map((reward) => reward.id)).toEqual([STAMP]);
		expect(rewardsOfLesson(CATALOGUE, FIRST)).toEqual([]);
	});

	it('is won by the tour passed with every key of the world acquired', () => {
		const won = (progress: ProgressState) =>
			unlockedRewards(CATALOGUE, PROGRESSION, progress).has(STAMP);
		expect(won(progressOf([FIRST, SECOND, TOUR], ALL_ACQUIRED))).toBe(true);
		// The tour not passed, or one key not acquired: not yet.
		expect(won(progressOf([FIRST, SECOND], ALL_ACQUIRED))).toBe(false);
		expect(won(progressOf([FIRST, SECOND, TOUR], { ...ALL_ACQUIRED, d: [12, 0] }))).toBe(false);
		expect(won(progressOf([FIRST, SECOND, TOUR], { ...ALL_ACQUIRED, j: [30, 9] }))).toBe(false);
		// A detour of the world is not asked for.
		expect(won(progressOf([FIRST, SECOND, TOUR], { ...ALL_ACQUIRED, î: [30, 20] }))).toBe(true);
	});

	it('is never won before the keys of the world are mastered, whatever the plays', () => {
		const attemptsArb = fc.tuple(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 40 }));
		fc.assert(
			fc.property(
				fc.subarray([FIRST, SECOND, DETOUR, TOUR]),
				fc.dictionary(fc.constantFrom(...KEYS, 'î'), attemptsArb),
				(lessons, raw) => {
					const chars = Object.fromEntries(
						Object.entries(raw)
							.filter(([, [attempts]]) => attempts > 0)
							.map(([char, [attempts, errors]]) => [char, [attempts, Math.min(errors, attempts)]])
					) as Record<string, [number, number]>;
					const progress = progressOf(lessons, chars);
					const won = unlockedRewards(CATALOGUE, PROGRESSION, progress).has(STAMP);
					const mastered = KEYS.every(
						(char) => charMastery(progress, char, MASTERY) === 'acquired'
					);
					expect(won).toBe(isLessonPassed(PROGRESSION.rules, progress, TOUR) && mastered);
				}
			)
		);
	});

	it('is never taken back: a key that becomes hard again keeps the stamp owned', () => {
		const wonThen = progressOf([FIRST, SECOND, TOUR], ALL_ACQUIRED);
		const earned = withNewlyEarned(CATALOGUE, PROGRESSION, wonThen, []);
		expect(earned).toEqual([STAMP]);
		const hardAgain = progressOf([FIRST, SECOND, TOUR], { ...ALL_ACQUIRED, f: [30, 15] });
		expect(unlockedRewards(CATALOGUE, PROGRESSION, hardAgain).has(STAMP)).toBe(false);
		expect(ownedRewards(CATALOGUE, PROGRESSION, hardAgain, earned).has(STAMP)).toBe(true);
	});

	it('is the same for the same progress: nothing is drawn', () => {
		const progress = progressOf([FIRST, SECOND, TOUR], ALL_ACQUIRED);
		for (let i = 0; i < 5; i++) {
			expect([...unlockedRewards(CATALOGUE, PROGRESSION, progress)]).toEqual([STAMP]);
		}
		expect(unlockedRewards(CATALOGUE, PROGRESSION, emptyProgress()).size).toBe(0);
	});
});
