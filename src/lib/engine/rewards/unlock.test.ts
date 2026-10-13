import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { emptyProgress } from '../progression/progress';
import type { ProgressState, StarCount } from '../progression/types';
import { parseRewardCatalogue } from './catalogue';
import { newlyUnlocked, rewardsOfLesson, unlockedRewards } from './unlock';
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
	WORLD_ONE,
	WORLD_TWO
} from './test-support';
import type { RewardCatalogue } from './types';

function catalogueOf(...entries: [string, unknown][]): RewardCatalogue {
	return parseRewardCatalogue(
		catalogueData(entries.map(([id, condition]) => rewardData(id, condition)))
	);
}

function unlockedIds(catalogue: RewardCatalogue, progress: ProgressState): string[] {
	return [...unlockedRewards(catalogue, PROGRESSION, progress)];
}

const ONE = 'fr.reward.one';

describe('unlockedRewards', () => {
	it('gives nothing to an empty progress', () => {
		const catalogue = catalogueOf(
			['one', { kind: 'lesson-passed', lessonId: LESSON_A }],
			['two', { kind: 'world-passed', worldId: WORLD_ONE }]
		);
		expect(unlockedIds(catalogue, emptyProgress())).toEqual([]);
	});

	describe('lesson-passed', () => {
		const catalogue = catalogueOf(['one', { kind: 'lesson-passed', lessonId: LESSON_A }]);

		it('opens at the accuracy that unlocks the next lesson, as the progression rules say', () => {
			expect(unlockedIds(catalogue, playLesson(emptyProgress(), LESSON_A, 79))).toEqual([]);
			expect(unlockedIds(catalogue, playLesson(emptyProgress(), LESSON_A, 80))).toEqual([ONE]);
		});

		it('keeps the best result: a later bad play takes nothing back', () => {
			const progress = playLesson(playLesson(emptyProgress(), LESSON_A, 95), LESSON_A, 10);
			expect(unlockedIds(catalogue, progress)).toEqual([ONE]);
		});

		it('ignores the other lessons', () => {
			expect(unlockedIds(catalogue, playLesson(emptyProgress(), LESSON_B, 100))).toEqual([]);
		});
	});

	describe('lesson-stars', () => {
		const catalogue = catalogueOf(['one', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 2 }]);

		it.each<[number, boolean]>([
			[80, false],
			[89, false],
			[90, true],
			[100, true]
		])('with an accuracy of %i, unlocked: %s', (accuracy, expected) => {
			expect(unlockedIds(catalogue, playLesson(emptyProgress(), LESSON_A, accuracy))).toEqual(
				expected ? [ONE] : []
			);
		});
	});

	describe('world-passed', () => {
		const catalogue = catalogueOf(['one', { kind: 'world-passed', worldId: WORLD_ONE }]);

		it('needs every lesson of the world', () => {
			const first = playLesson(emptyProgress(), LESSON_A, 100);
			expect(unlockedIds(catalogue, first)).toEqual([]);
			expect(unlockedIds(catalogue, playLesson(first, LESSON_B, 100))).toEqual([ONE]);
		});

		it('is not fooled by a lesson of another world', () => {
			const progress = playLesson(playLesson(emptyProgress(), LESSON_A, 100), LESSON_C, 100);
			expect(unlockedIds(catalogue, progress)).toEqual([]);
		});

		it('is not fulfilled by a lesson that is played but not passed', () => {
			const progress = playLesson(playLesson(emptyProgress(), LESSON_A, 100), LESSON_B, 50);
			expect(unlockedIds(catalogue, progress)).toEqual([]);
		});
	});

	describe('world-stars', () => {
		const catalogue = catalogueOf(['one', { kind: 'world-stars', worldId: WORLD_ONE, stars: 3 }]);

		it('needs the stars on each lesson of the world, not on one only', () => {
			const first = playLesson(emptyProgress(), LESSON_A, 100);
			expect(unlockedIds(catalogue, first)).toEqual([]);
			expect(unlockedIds(catalogue, playLesson(first, LESSON_B, 96))).toEqual([]);
			expect(unlockedIds(catalogue, playLesson(first, LESSON_B, 97))).toEqual([ONE]);
		});
	});

	describe('chars-mastered', () => {
		const condition = {
			kind: 'chars-mastered',
			chars: ['f', 'j'],
			minAttempts: 30,
			maxErrorRate: 0.1
		};
		const catalogue = catalogueOf(['one', condition]);

		function play(progress: ProgressState, perF: [number, number], perJ: [number, number]) {
			return playLesson(progress, LESSON_A, 90, {
				f: stats(...perF),
				j: stats(...perJ)
			});
		}

		it('needs every character, not one of them', () => {
			expect(unlockedIds(catalogue, play(emptyProgress(), [30, 0], [30, 5]))).toEqual([]);
			expect(unlockedIds(catalogue, play(emptyProgress(), [30, 0], [30, 3]))).toEqual([ONE]);
		});

		it('needs enough keystrokes', () => {
			expect(unlockedIds(catalogue, play(emptyProgress(), [29, 0], [30, 0]))).toEqual([]);
		});

		it('does not unlock a character that was never typed', () => {
			expect(unlockedIds(catalogue, playLesson(emptyProgress(), LESSON_A, 100))).toEqual([]);
		});

		it('accepts an error rate exactly at the limit', () => {
			expect(unlockedIds(catalogue, play(emptyProgress(), [30, 3], [30, 3]))).toEqual([ONE]);
		});

		it('rewards a key that was missed for a long time and then tamed', () => {
			let progress = emptyProgress();
			for (let i = 0; i < 3; i += 1) progress = play(progress, [10, 5], [10, 0]);
			progress = play(progress, [10, 0], [20, 0]);
			expect(unlockedIds(catalogue, progress)).toEqual([]);
			for (let i = 0; i < 3; i += 1) progress = play(progress, [10, 0], [10, 0]);
			expect(progress.chars['f']).toMatchObject({ attempts: 70, errors: 15 });
			expect(unlockedIds(catalogue, progress)).toEqual([ONE]);
		});

		it('is not blocked by the lifetime totals of a key that was hard for long', () => {
			// A third of the 90 lifetime keystrokes of "f" were wrong, which would block it for good;
			// its 30 recent ones are clean.
			let progress = emptyProgress();
			for (let i = 0; i < 6; i += 1) progress = play(progress, [10, 5], [30, 0]);
			for (let i = 0; i < 3; i += 1) progress = play(progress, [10, 0], [30, 0]);
			expect(unlockedIds(catalogue, progress)).toEqual([ONE]);
		});
	});

	describe('conditions on something the progression does not have', () => {
		const catalogue = catalogueOf(
			['one', { kind: 'lesson-passed', lessonId: 'fr.lesson.ghost' }],
			['two', { kind: 'lesson-stars', lessonId: 'fr.lesson.ghost', stars: 1 }],
			['three', { kind: 'world-passed', worldId: 'fr.world.ghost' }],
			['four', { kind: 'world-stars', worldId: 'fr.world.ghost', stars: 1 }]
		);

		it('are never fulfilled, even when the progress mentions the lesson', () => {
			const progress: ProgressState = {
				lessons: {
					'fr.lesson.ghost': { bestAccuracy: 100, stars: 3, attempts: 1, lastPlayedAt: 0 }
				},
				chars: {}
			};
			expect(unlockedIds(catalogue, progress)).toEqual([]);
		});
	});

	it('does not read the prototype chain of the progress', () => {
		const catalogue = catalogueOf(['one', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 1 }]);
		expect(
			unlockedIds(catalogue, { lessons: Object.create({ [LESSON_A]: { stars: 3 } }), chars: {} })
		).toEqual([]);
	});

	it('does not mutate its inputs', () => {
		const catalogue = catalogueOf(['one', { kind: 'lesson-passed', lessonId: LESSON_A }]);
		const progress = playLesson(emptyProgress(), LESSON_A, 100);
		const copy = structuredClone(progress);
		unlockedRewards(catalogue, PROGRESSION, progress);
		expect(progress).toEqual(copy);
	});
});

describe('newlyUnlocked', () => {
	const catalogue = catalogueOf(
		['a', { kind: 'lesson-passed', lessonId: LESSON_A }],
		['b', { kind: 'lesson-passed', lessonId: LESSON_B }],
		['w', { kind: 'world-passed', worldId: WORLD_ONE }],
		['c', { kind: 'lesson-passed', lessonId: LESSON_C }]
	);

	it('lists what one play brings, in the order of the catalogue', () => {
		const before = playLesson(emptyProgress(), LESSON_A, 90);
		const after = playLesson(before, LESSON_B, 90);
		expect(newlyUnlocked(catalogue, PROGRESSION, before, after).map((r) => r.id)).toEqual([
			'fr.reward.b',
			'fr.reward.w'
		]);
	});

	it('lists nothing for a play that earns nothing new', () => {
		const before = playLesson(emptyProgress(), LESSON_A, 90);
		expect(
			newlyUnlocked(catalogue, PROGRESSION, before, playLesson(before, LESSON_A, 100))
		).toEqual([]);
	});

	it('gives an old profile everything it has already earned', () => {
		const old = playLesson(playLesson(emptyProgress(), LESSON_A, 100), LESSON_B, 100);
		expect(newlyUnlocked(catalogue, PROGRESSION, emptyProgress(), old).map((r) => r.id)).toEqual([
			'fr.reward.a',
			'fr.reward.b',
			'fr.reward.w'
		]);
	});

	it('does not announce a reward that was lost, only what is gained', () => {
		const owned = playLesson(emptyProgress(), LESSON_A, 100);
		expect(newlyUnlocked(catalogue, PROGRESSION, owned, emptyProgress())).toEqual([]);
	});
});

describe('rewardsOfLesson', () => {
	const catalogue = catalogueOf(
		['a1', { kind: 'lesson-passed', lessonId: LESSON_A }],
		['b1', { kind: 'lesson-passed', lessonId: LESSON_B }],
		['a2', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 3 }],
		['w', { kind: 'world-passed', worldId: WORLD_ONE }],
		['k', { kind: 'chars-mastered', chars: ['f'], minAttempts: 5, maxErrorRate: 0 }]
	);

	it('lists the rewards that name the lesson, in the order of the catalogue', () => {
		expect(rewardsOfLesson(catalogue, LESSON_A).map((r) => r.id)).toEqual([
			'fr.reward.a1',
			'fr.reward.a2'
		]);
	});

	it('is empty for a lesson nothing names, or that does not exist', () => {
		expect(rewardsOfLesson(catalogue, LESSON_C)).toEqual([]);
		expect(rewardsOfLesson(catalogue, 'fr.lesson.ghost')).toEqual([]);
	});

	it('does not announce world or character rewards', () => {
		expect(rewardsOfLesson(catalogue, LESSON_B).map((r) => r.id)).toEqual(['fr.reward.b1']);
	});
});

describe('properties', () => {
	const STARS: readonly StarCount[] = [0, 1, 2, 3];
	const CHARS = ['f', 'j', 'd', 'k', 's', 'l'];

	const ALL_CONDITIONS: [string, unknown][] = [
		...LESSON_IDS.flatMap((lessonId, i): [string, unknown][] => [
			[`pass-${i}`, { kind: 'lesson-passed', lessonId }],
			[`star1-${i}`, { kind: 'lesson-stars', lessonId, stars: 1 }],
			[`star3-${i}`, { kind: 'lesson-stars', lessonId, stars: 3 }]
		]),
		...[WORLD_ONE, WORLD_TWO].flatMap((worldId, i): [string, unknown][] => [
			[`wpass-${i}`, { kind: 'world-passed', worldId }],
			[`wstar2-${i}`, { kind: 'world-stars', worldId, stars: 2 }]
		]),
		['mastered', { kind: 'chars-mastered', chars: ['f', 'd'], minAttempts: 10, maxErrorRate: 0.2 }]
	];
	const CATALOGUE = catalogueOf(...ALL_CONDITIONS);
	const MONOTONE = parseRewardCatalogue(
		catalogueData(
			ALL_CONDITIONS.filter(([, c]) => (c as { kind: string }).kind !== 'chars-mastered').map(
				([id, condition]) => rewardData(id, condition)
			)
		)
	);

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
		chars: fc.dictionary(fc.constantFrom(...CHARS), charProgress)
	});

	/** Better lessons only (more accuracy, more stars); the characters stay as they were. */
	function improved(before: ProgressState, other: ProgressState): ProgressState {
		const lessons: Record<string, ProgressState['lessons'][string]> = { ...before.lessons };
		for (const [id, lesson] of Object.entries(other.lessons)) {
			const previous = lessons[id];
			lessons[id] =
				previous === undefined
					? lesson
					: {
							...previous,
							bestAccuracy: Math.max(previous.bestAccuracy, lesson.bestAccuracy),
							stars: Math.max(previous.stars, lesson.stars) as StarCount
						};
		}
		return { lessons, chars: before.chars };
	}

	it('never takes back a lesson or world reward when the progress improves', () => {
		fc.assert(
			fc.property(progressArb, progressArb, (before, other) => {
				const after = improved(before, other);
				const owned = unlockedRewards(MONOTONE, PROGRESSION, before);
				const kept = unlockedRewards(MONOTONE, PROGRESSION, after);
				for (const id of owned) expect(kept.has(id)).toBe(true);
			})
		);
	});

	it('splits what improved progress earns into the old and the new', () => {
		fc.assert(
			fc.property(progressArb, progressArb, (before, other) => {
				const after = improved(before, other);
				const owned = unlockedRewards(CATALOGUE, PROGRESSION, before);
				const fresh = newlyUnlocked(CATALOGUE, PROGRESSION, before, after).map((r) => r.id);
				const all = unlockedRewards(CATALOGUE, PROGRESSION, after);
				expect(fresh.filter((id) => owned.has(id))).toEqual([]);
				expect(new Set([...owned, ...fresh])).toEqual(all);
			})
		);
	});

	it('only returns identifiers of the catalogue', () => {
		const known = new Set(CATALOGUE.rewards.map((reward) => reward.id));
		fc.assert(
			fc.property(progressArb, (progress) => {
				for (const id of unlockedRewards(CATALOGUE, PROGRESSION, progress)) {
					expect(known.has(id)).toBe(true);
				}
			})
		);
	});

	it('gives the same answer for the same progress', () => {
		fc.assert(
			fc.property(progressArb, (progress) => {
				const first = unlockedRewards(CATALOGUE, PROGRESSION, progress);
				const second = unlockedRewards(CATALOGUE, PROGRESSION, structuredClone(progress));
				expect([...first]).toEqual([...second]);
			})
		);
	});
});
