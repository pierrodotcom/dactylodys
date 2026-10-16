import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { emptyProgress } from '../progression/progress';
import type { ProgressState, StarCount } from '../progression/types';
import { parseRewardCatalogue } from './catalogue';
import { ownedRewards, rewardsToAnnounce, withNewlyEarned } from './owned';
import {
	catalogueData,
	LESSON_A,
	LESSON_B,
	LESSON_C,
	LESSON_IDS,
	playLesson,
	PROGRESSION,
	rewardData,
	stats,
	WORLD_ONE
} from './test-support';
import type { RewardCatalogue } from './types';
import { unlockedRewards } from './unlock';

const CONDITIONS: [string, unknown][] = [
	['pass-a', { kind: 'lesson-passed', lessonId: LESSON_A }],
	['pass-b', { kind: 'lesson-passed', lessonId: LESSON_B }],
	['stars-c', { kind: 'lesson-stars', lessonId: LESSON_C, stars: 2 }],
	['world-one', { kind: 'world-passed', worldId: WORLD_ONE }],
	['mastered', { kind: 'chars-mastered', chars: ['f'], minAttempts: 10, maxErrorRate: 0.2 }]
];

const CATALOGUE: RewardCatalogue = parseRewardCatalogue(
	catalogueData(CONDITIONS.map(([id, condition]) => rewardData(id, condition)))
);
const IDS = CATALOGUE.rewards.map((reward) => reward.id);
const [PASS_A, PASS_B, STARS_C, WORLD, MASTERED] = IDS as [string, string, string, string, string];

const owned = (progress: ProgressState, earned: readonly string[]) => [
	...ownedRewards(CATALOGUE, PROGRESSION, progress, earned)
];

describe('ownedRewards', () => {
	it('is empty for a new child who kept nothing', () => {
		expect(owned(emptyProgress(), [])).toEqual([]);
	});

	it('is what the progress unlocks when nothing was kept', () => {
		const progress = playLesson(emptyProgress(), LESSON_A, 90);
		expect(owned(progress, [])).toEqual([PASS_A]);
	});

	it('keeps what was earned although the progress no longer earns it', () => {
		expect(owned(emptyProgress(), [PASS_B])).toEqual([PASS_B]);
	});

	it('keeps a mastered key once earned although it became hard again', () => {
		const hard = playLesson(emptyProgress(), LESSON_A, 90, { f: stats(30, 20) });
		expect(unlockedRewards(CATALOGUE, PROGRESSION, hard).has(MASTERED)).toBe(false);
		expect(ownedRewards(CATALOGUE, PROGRESSION, hard, [MASTERED]).has(MASTERED)).toBe(true);
	});

	it('is the union of both without repeating anything', () => {
		const progress = playLesson(emptyProgress(), LESSON_A, 90);
		const result = owned(progress, [PASS_A, PASS_B]);
		expect(result.sort()).toEqual([PASS_A, PASS_B].sort());
	});

	it('leaves out an identifier the catalogue does not have', () => {
		expect(owned(emptyProgress(), ['fr.reward.gone', PASS_A])).toEqual([PASS_A]);
	});

	it('does not change the list it receives', () => {
		const earned = Object.freeze([PASS_A]);
		expect(() => ownedRewards(CATALOGUE, PROGRESSION, emptyProgress(), earned)).not.toThrow();
		expect(earned).toEqual([PASS_A]);
	});
});

describe('withNewlyEarned', () => {
	it('returns the very same list when nothing is new', () => {
		const earned = [PASS_A];
		const progress = playLesson(emptyProgress(), LESSON_A, 90);
		expect(withNewlyEarned(CATALOGUE, PROGRESSION, progress, earned)).toBe(earned);
		const empty: readonly string[] = [];
		expect(withNewlyEarned(CATALOGUE, PROGRESSION, emptyProgress(), empty)).toBe(empty);
	});

	it('appends what is new after what was kept, in the order of the catalogue', () => {
		const progress = playLesson(playLesson(emptyProgress(), LESSON_B, 90), LESSON_A, 90);
		expect(withNewlyEarned(CATALOGUE, PROGRESSION, progress, [STARS_C])).toEqual([
			STARS_C,
			PASS_A,
			PASS_B,
			WORLD
		]);
	});

	it('never removes what was kept, even an identifier the catalogue does not know', () => {
		const earned = ['fr.reward.gone', MASTERED];
		const next = withNewlyEarned(CATALOGUE, PROGRESSION, emptyProgress(), earned);
		expect(next).toEqual(earned);
	});

	it('does not repeat an identifier already kept', () => {
		const progress = playLesson(emptyProgress(), LESSON_A, 90);
		expect(withNewlyEarned(CATALOGUE, PROGRESSION, progress, [PASS_A])).toEqual([PASS_A]);
	});
});

describe('rewardsToAnnounce', () => {
	it('gives what the new progress unlocks and the profile has not kept', () => {
		const after = playLesson(emptyProgress(), LESSON_A, 90);
		expect(rewardsToAnnounce(CATALOGUE, PROGRESSION, [], after).map(({ id }) => id)).toEqual([
			PASS_A
		]);
	});

	it('gives nothing for what was kept, whether the progress still earns it or not', () => {
		const after = playLesson(emptyProgress(), LESSON_A, 90);
		expect(rewardsToAnnounce(CATALOGUE, PROGRESSION, [PASS_A], after)).toEqual([]);
	});

	it('gives nothing when the progress earns nothing', () => {
		expect(rewardsToAnnounce(CATALOGUE, PROGRESSION, [], emptyProgress())).toEqual([]);
	});

	it('announces only what the profile lacks, even when another reward was kept', () => {
		const after = playLesson(playLesson(emptyProgress(), LESSON_A, 90), LESSON_B, 90);
		const ids = rewardsToAnnounce(CATALOGUE, PROGRESSION, [PASS_B], after).map(({ id }) => id);
		expect(ids).toEqual([PASS_A, WORLD]);
	});
});

describe('properties', () => {
	const STARS: readonly StarCount[] = [0, 1, 2, 3];
	const lessonProgress = fc.record({
		bestAccuracy: fc.integer({ min: 0, max: 100 }),
		stars: fc.constantFrom(...STARS),
		attempts: fc.integer({ min: 1, max: 20 }),
		lastPlayedAt: fc.constant(0)
	});
	const charProgress = fc.record({
		attempts: fc.integer({ min: 1, max: 100 }),
		errors: fc.constant(0),
		recent: fc.array(
			fc.integer({ min: 1, max: 30 }).chain((attempts) =>
				fc.record({
					attempts: fc.constant(attempts),
					errors: fc.integer({ min: 0, max: attempts })
				})
			),
			{ maxLength: 4 }
		)
	});
	const progressArb: fc.Arbitrary<ProgressState> = fc.record({
		lessons: fc
			.dictionary(fc.constantFrom(...LESSON_IDS), lessonProgress)
			.map((lessons) => lessons as ProgressState['lessons']),
		chars: fc.dictionary(fc.constantFrom('f', 'j', 'd', 'k'), charProgress)
	});
	const earnedArb = fc.subarray([...IDS, 'fr.reward.gone']);

	it('owns every kept reward the catalogue knows', () => {
		fc.assert(
			fc.property(progressArb, earnedArb, (progress, earned) => {
				const result = ownedRewards(CATALOGUE, PROGRESSION, progress, earned);
				for (const id of earned) expect(result.has(id)).toBe(IDS.includes(id));
			})
		);
	});

	it('owns at least what the progress unlocks', () => {
		fc.assert(
			fc.property(progressArb, earnedArb, (progress, earned) => {
				const result = ownedRewards(CATALOGUE, PROGRESSION, progress, earned);
				for (const id of unlockedRewards(CATALOGUE, PROGRESSION, progress)) {
					expect(result.has(id)).toBe(true);
				}
			})
		);
	});

	it('never owns less when the progress gets worse, once the earnings are kept', () => {
		fc.assert(
			fc.property(progressArb, progressArb, (better, worse) => {
				const kept = withNewlyEarned(CATALOGUE, PROGRESSION, better, []);
				const before = ownedRewards(CATALOGUE, PROGRESSION, better, kept);
				const after = ownedRewards(CATALOGUE, PROGRESSION, worse, kept);
				for (const id of before) expect(after.has(id)).toBe(true);
			})
		);
	});

	it('keeps the earned list as a prefix and adds each identifier at most once', () => {
		fc.assert(
			fc.property(progressArb, earnedArb, (progress, earned) => {
				const next = withNewlyEarned(CATALOGUE, PROGRESSION, progress, earned);
				expect(next.slice(0, earned.length)).toEqual(earned);
				expect(new Set(next).size).toBe(new Set(earned).size + (next.length - earned.length));
				if (next.length === earned.length) expect(next).toBe(earned);
			})
		);
	});

	it('is idempotent: keeping twice changes nothing more', () => {
		fc.assert(
			fc.property(progressArb, earnedArb, (progress, earned) => {
				const once = withNewlyEarned(CATALOGUE, PROGRESSION, progress, earned);
				expect(withNewlyEarned(CATALOGUE, PROGRESSION, progress, once)).toBe(once);
			})
		);
	});

	it('announces exactly what is neither kept nor already owned before, then nothing once kept', () => {
		fc.assert(
			fc.property(progressArb, earnedArb, (progress, earned) => {
				const announced = rewardsToAnnounce(CATALOGUE, PROGRESSION, earned, progress).map(
					({ id }) => id
				);
				for (const id of announced) expect(earned).not.toContain(id);
				const kept = withNewlyEarned(CATALOGUE, PROGRESSION, progress, earned);
				expect(kept.slice(earned.length)).toEqual(announced);
				expect(rewardsToAnnounce(CATALOGUE, PROGRESSION, kept, progress)).toEqual([]);
			})
		);
	});
});
