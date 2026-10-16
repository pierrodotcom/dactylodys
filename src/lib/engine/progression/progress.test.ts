import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeAccuracy } from '../accuracy';
import type { CharStats, SessionMetrics } from '../types';
import { parseProgression } from './definition';
import {
	almostNextStar,
	applyCharResults,
	applyLessonResult,
	emptyProgress,
	evaluateLesson,
	isLessonPassed,
	isLessonUnlocked,
	recentCharStats,
	recentErrorRate
} from './progress';
import { deepFreeze, loadShippedProgressions } from './test-support';
import type {
	CharSample,
	LessonResult,
	ProgressionDefinition,
	ProgressionRules,
	ProgressState,
	StarCount
} from './types';

const RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 0,
	recentCharWindow: 30
};

const PROGRESSION: ProgressionDefinition = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: RULES,
	worlds: [
		{
			id: 'fr.world.one',
			title: 'One',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				{
					id: 'fr.lesson.a',
					title: 'A',
					intro: 'Intro.',
					newChars: ['f', 'j'],
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 5,
					targetLength: 20,
					groupLength: [2, 4]
				},
				{
					id: 'fr.lesson.b',
					title: 'B',
					intro: 'Intro.',
					newChars: ['d', 'k'],
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 5,
					targetLength: 20,
					groupLength: [2, 4]
				}
			]
		},
		{
			id: 'fr.world.two',
			title: 'Two',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				{
					id: 'fr.lesson.c',
					title: 'C',
					intro: 'Intro.',
					newChars: ['s', 'l'],
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 5,
					targetLength: 20,
					groupLength: [2, 4]
				}
			]
		}
	]
});

function metricsWith(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
	return {
		elapsedMs: 60_000,
		totalKeystrokes: 100,
		correctKeystrokes: 100,
		errorCount: 0,
		accuracy: 100,
		correctCharsPerMinute: 100,
		wordsPerMinute: 20,
		perChar: {},
		...overrides
	};
}

function resultOf(
	lessonId: string,
	accuracy: number,
	overrides: Partial<LessonResult> = {},
	perChar: Record<string, CharStats> = {}
): LessonResult {
	const metrics = metricsWith({ accuracy, perChar });
	return {
		lessonId,
		metrics,
		evaluation: evaluateLesson(RULES, metrics),
		completedAt: 1000,
		...overrides
	};
}

function stats(attempts: number, errors: number): CharStats {
	return { attempts, errors, meanLatencyMs: null };
}

function applyResult(progress: ProgressState, result: LessonResult): ProgressState {
	return applyLessonResult(progress, result, RULES);
}

function total(samples: readonly CharSample[]): number {
	return samples.reduce((sum, sample) => sum + sample.attempts, 0);
}

describe('evaluateLesson', () => {
	it.each<[number, StarCount, boolean]>([
		[0, 0, false],
		[79.99, 0, false],
		[80, 1, true],
		[89.99, 1, true],
		[90, 2, true],
		[96.99, 2, true],
		[97, 3, true],
		[100, 3, true]
	])('maps an accuracy of %f to %i star(s), unlocking: %s', (accuracy, stars, unlocksNext) => {
		expect(evaluateLesson(RULES, metricsWith({ accuracy }))).toEqual({ stars, unlocksNext });
	});

	it('reads thresholds from the rules, not from constants', () => {
		const rules: ProgressionRules = {
			unlockAccuracy: 50,
			starThresholds: [60, 70, 80],
			newCharWeight: 0.6,
			weakCharBoost: 0,
			themeBoost: 0,
			newCharMinCount: 0,
			recentCharWindow: 30
		};
		expect(evaluateLesson(rules, metricsWith({ accuracy: 55 }))).toEqual({
			stars: 0,
			unlocksNext: true
		});
		expect(evaluateLesson(rules, metricsWith({ accuracy: 75 }))).toEqual({
			stars: 2,
			unlocksNext: true
		});
	});

	it('does not lose a threshold to floating point rounding', () => {
		const rules: ProgressionRules = { ...RULES, starThresholds: [57, 58, 59] };
		const accuracy = computeAccuracy(57, 100);
		expect(accuracy).toBeLessThan(57);
		expect(evaluateLesson(rules, metricsWith({ accuracy })).stars).toBe(1);
	});

	it('ignores the typing speed completely', () => {
		const slow = metricsWith({ accuracy: 92, correctCharsPerMinute: 1, wordsPerMinute: 0.2 });
		const fast = metricsWith({ accuracy: 92, correctCharsPerMinute: 900, wordsPerMinute: 180 });
		expect(evaluateLesson(RULES, slow)).toEqual(evaluateLesson(RULES, fast));
		expect(evaluateLesson(RULES, slow)).toEqual({ stars: 2, unlocksNext: true });
	});

	it('is monotone with accuracy', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0, max: 100, noNaN: true }),
				fc.double({ min: 0, max: 100, noNaN: true }),
				(first, second) => {
					const [low, high] = first <= second ? [first, second] : [second, first];
					const lower = evaluateLesson(RULES, metricsWith({ accuracy: low }));
					const higher = evaluateLesson(RULES, metricsWith({ accuracy: high }));
					expect(higher.stars).toBeGreaterThanOrEqual(lower.stars);
					expect(Number(higher.unlocksNext)).toBeGreaterThanOrEqual(Number(lower.unlocksNext));
				}
			)
		);
	});

	it('gives the same result whatever the speed', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0, max: 100, noNaN: true }),
				fc.double({ min: 0, max: 1000, noNaN: true }),
				(accuracy, speed) => {
					expect(
						evaluateLesson(RULES, metricsWith({ accuracy, correctCharsPerMinute: speed }))
					).toEqual(evaluateLesson(RULES, metricsWith({ accuracy, correctCharsPerMinute: 0 })));
				}
			)
		);
	});
});

describe('emptyProgress', () => {
	it('starts with nothing', () => {
		expect(emptyProgress()).toEqual({ lessons: {}, chars: {} });
	});

	it('returns a fresh object each time', () => {
		expect(emptyProgress()).not.toBe(emptyProgress());
	});
});

describe('applyLessonResult', () => {
	it('records a first attempt', () => {
		const next = applyResult(emptyProgress(), resultOf('fr.lesson.a', 92, { completedAt: 5000 }));
		expect(next.lessons['fr.lesson.a']).toEqual({
			bestAccuracy: 92,
			stars: 2,
			attempts: 1,
			lastPlayedAt: 5000
		});
	});

	it('keeps the best accuracy and the best stars after a worse attempt', () => {
		const good = applyResult(emptyProgress(), resultOf('fr.lesson.a', 98));
		const worse = applyResult(good, resultOf('fr.lesson.a', 70, { completedAt: 9000 }));
		expect(worse.lessons['fr.lesson.a']).toEqual({
			bestAccuracy: 98,
			stars: 3,
			attempts: 2,
			lastPlayedAt: 9000
		});
	});

	it('improves the best accuracy and the stars after a better attempt', () => {
		const first = applyResult(emptyProgress(), resultOf('fr.lesson.a', 82));
		const second = applyResult(first, resultOf('fr.lesson.a', 91));
		expect(second.lessons['fr.lesson.a']).toMatchObject({
			bestAccuracy: 91,
			stars: 2,
			attempts: 2
		});
	});

	it('leaves the other lessons untouched', () => {
		const first = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		const second = applyResult(first, resultOf('fr.lesson.b', 85));
		expect(second.lessons['fr.lesson.a']).toEqual(first.lessons['fr.lesson.a']);
		expect(Object.keys(second.lessons)).toEqual(['fr.lesson.a', 'fr.lesson.b']);
	});

	it('accumulates attempts and errors per character over sessions', () => {
		const first = applyResult(
			emptyProgress(),
			resultOf('fr.lesson.a', 90, {}, { f: stats(10, 1), j: stats(8, 0) })
		);
		const second = applyResult(
			first,
			resultOf('fr.lesson.b', 90, {}, { f: stats(5, 2), d: stats(4, 1) })
		);
		expect(second.chars).toMatchObject({
			f: { attempts: 15, errors: 3 },
			j: { attempts: 8, errors: 0 },
			d: { attempts: 4, errors: 1 }
		});
		expect(Object.keys(second.chars)).toEqual(['f', 'j', 'd']);
	});

	it('keeps one sample per play in which the character was asked, oldest first', () => {
		const first = applyResult(
			emptyProgress(),
			resultOf('fr.lesson.a', 90, {}, { f: stats(10, 1), j: stats(8, 0) })
		);
		const second = applyResult(
			first,
			resultOf('fr.lesson.b', 90, {}, { f: stats(5, 2), d: stats(4, 1) })
		);
		expect(second.chars['f']?.recent).toEqual([
			{ attempts: 10, errors: 1 },
			{ attempts: 5, errors: 2 }
		]);
		expect(second.chars['j']?.recent).toEqual([{ attempts: 8, errors: 0 }]);
		expect(second.chars['d']?.recent).toEqual([{ attempts: 4, errors: 1 }]);
	});

	it('adds no sample for a character that was not typed', () => {
		const first = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90, {}, { f: stats(0, 0) }));
		expect(first.chars['f']).toEqual({ attempts: 0, errors: 0, recent: [] });
		const played = applyResult(first, resultOf('fr.lesson.a', 90, {}, { f: stats(6, 1) }));
		const again = applyResult(played, resultOf('fr.lesson.a', 90, {}, { f: stats(0, 0) }));
		expect(again.chars['f']).toEqual({
			attempts: 6,
			errors: 1,
			recent: [{ attempts: 6, errors: 1 }]
		});
	});

	it('keeps every play while the recent ones do not cover the window', () => {
		let progress = emptyProgress();
		for (const attempts of [10, 10, 9]) {
			progress = applyResult(progress, resultOf('fr.lesson.a', 90, {}, { f: stats(attempts, 1) }));
		}
		expect(progress.chars['f']?.recent.map((sample) => sample.attempts)).toEqual([10, 10, 9]);
	});

	it('forgets the oldest plays once the more recent ones cover the window', () => {
		let progress = emptyProgress();
		for (const [attempts, errors] of [
			[12, 12],
			[20, 0],
			[15, 0]
		] as const) {
			progress = applyResult(
				progress,
				resultOf('fr.lesson.a', 90, {}, { f: stats(attempts, errors) })
			);
		}
		expect(progress.chars['f']).toEqual({
			attempts: 47,
			errors: 12,
			recent: [
				{ attempts: 20, errors: 0 },
				{ attempts: 15, errors: 0 }
			]
		});
	});

	it('keeps a play that covers the window on its own, and only that one', () => {
		const first = applyResult(
			emptyProgress(),
			resultOf('fr.lesson.a', 90, {}, { f: stats(10, 9) })
		);
		const second = applyResult(first, resultOf('fr.lesson.a', 90, {}, { f: stats(30, 3) }));
		expect(second.chars['f']?.recent).toEqual([{ attempts: 30, errors: 3 }]);
	});

	it('reads the window from the rules, not from a constant', () => {
		const narrow: ProgressionRules = { ...RULES, recentCharWindow: 5 };
		let progress = emptyProgress();
		for (const attempts of [4, 3, 2]) {
			progress = applyLessonResult(
				progress,
				resultOf('fr.lesson.a', 90, {}, { f: stats(attempts, 0) }),
				narrow
			);
		}
		expect(progress.chars['f']?.recent.map((sample) => sample.attempts)).toEqual([3, 2]);
		expect(progress.chars['f']?.attempts).toBe(9);
	});

	it('leaves the samples of the characters that were not asked untouched', () => {
		const first = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90, {}, { f: stats(3, 1) }));
		const second = applyResult(first, resultOf('fr.lesson.a', 90, {}, { j: stats(40, 0) }));
		expect(second.chars['f']).toEqual(first.chars['f']);
	});

	it('does not mutate the previous progress or the result', () => {
		const progress = deepFreeze(
			applyResult(emptyProgress(), resultOf('fr.lesson.a', 85, {}, { f: stats(3, 1) }))
		);
		const result = deepFreeze(resultOf('fr.lesson.a', 95, {}, { f: stats(4, 0) }));
		const snapshot = structuredClone(progress);
		const next = applyResult(progress, result);
		expect(progress).toEqual(snapshot);
		expect(next).not.toBe(progress);
		expect(next.lessons['fr.lesson.a']?.attempts).toBe(2);
	});

	const attempt = fc.record({
		lessonIndex: fc.integer({ min: 0, max: 2 }),
		accuracy: fc.double({ min: 0, max: 100, noNaN: true }),
		completedAt: fc.integer({ min: 0, max: 1_000_000 }),
		errors: fc.integer({ min: 0, max: 20 })
	});

	it('never lowers the stars or the best accuracy and never touches a frozen input', () => {
		const ids = ['fr.lesson.a', 'fr.lesson.b', 'fr.lesson.c'];
		fc.assert(
			fc.property(fc.array(attempt, { maxLength: 30 }), (attempts) => {
				let progress: ProgressState = deepFreeze(emptyProgress());
				for (const { lessonIndex, accuracy, completedAt, errors } of attempts) {
					const id = ids[lessonIndex] as string;
					const before = progress.lessons[id];
					const result = deepFreeze(
						resultOf(id, accuracy, { completedAt }, { f: stats(20, errors) })
					);
					progress = deepFreeze(applyResult(progress, result));
					const after = progress.lessons[id] as NonNullable<typeof before>;
					expect(after.bestAccuracy).toBeGreaterThanOrEqual(before?.bestAccuracy ?? 0);
					expect(after.stars).toBeGreaterThanOrEqual(before?.stars ?? 0);
					expect(after.attempts).toBe((before?.attempts ?? 0) + 1);
					expect(after.bestAccuracy).toBeGreaterThanOrEqual(accuracy);
				}
				const played = attempts.length;
				const lessonAttempts = Object.values(progress.lessons).reduce(
					(sum, lesson) => sum + lesson.attempts,
					0
				);
				expect(lessonAttempts).toBe(played);
				expect(progress.chars['f']?.attempts ?? 0).toBe(played * 20);
			})
		);
	});
});

const playArb = fc
	.record({ attempts: fc.integer({ min: 0, max: 60 }), errors: fc.integer({ min: 0, max: 60 }) })
	.map(({ attempts, errors }) => stats(attempts, Math.min(attempts, errors)));
const windowArb = fc.integer({ min: 1, max: 50 });

describe('recent results per character', () => {
	it('never keeps more than what covers the window, and always the most recent plays', () => {
		fc.assert(
			fc.property(fc.array(playArb, { maxLength: 30 }), windowArb, (plays, recentCharWindow) => {
				const rules: ProgressionRules = { ...RULES, recentCharWindow };
				let progress: ProgressState = deepFreeze(emptyProgress());
				for (const play of plays) {
					const before = progress.chars['f']?.recent ?? [];
					const result = deepFreeze(resultOf('fr.lesson.a', 90, {}, { f: play }));
					progress = deepFreeze(applyLessonResult(progress, result, rules));
					const after = progress.chars['f']?.recent ?? [];

					const candidates =
						play.attempts > 0
							? [...before, { attempts: play.attempts, errors: play.errors }]
							: before;
					expect(after).toEqual(candidates.slice(candidates.length - after.length));
					if (play.attempts > 0) expect(after.length).toBeGreaterThan(0);

					const [oldest] = after;
					if (oldest !== undefined) {
						expect(total(after) - oldest.attempts).toBeLessThan(recentCharWindow);
					}
					if (total(after) < recentCharWindow) expect(after).toEqual(candidates);
					const largest = Math.max(0, ...candidates.map((sample) => sample.attempts));
					expect(total(after)).toBeLessThanOrEqual(recentCharWindow + largest - 1);
					for (const sample of after) {
						expect(sample.attempts).toBeGreaterThanOrEqual(1);
						expect(sample.errors).toBeGreaterThanOrEqual(0);
						expect(sample.errors).toBeLessThanOrEqual(sample.attempts);
					}
				}
			})
		);
	});

	it('leaves the lifetime totals exactly as a plain sum of every play', () => {
		const playOf = fc.dictionary(fc.constantFrom('f', 'j', 'é', ' '), playArb, { maxKeys: 4 });
		fc.assert(
			fc.property(fc.array(playOf, { maxLength: 20 }), windowArb, (plays, recentCharWindow) => {
				const rules: ProgressionRules = { ...RULES, recentCharWindow };
				let progress = emptyProgress();
				const expected: Record<string, { attempts: number; errors: number }> = {};
				for (const perChar of plays) {
					progress = applyLessonResult(progress, resultOf('fr.lesson.a', 90, {}, perChar), rules);
					for (const [char, play] of Object.entries(perChar)) {
						const sum = (expected[char] ??= { attempts: 0, errors: 0 });
						sum.attempts += play.attempts;
						sum.errors += play.errors;
					}
				}
				const totals = Object.fromEntries(
					Object.entries(progress.chars).map(([char, { attempts, errors }]) => [
						char,
						{ attempts, errors }
					])
				);
				expect(totals).toEqual(expected);
			})
		);
	});

	it('forgets old errors once the character was typed without error over the window', () => {
		const cleanPlay = fc.integer({ min: 1, max: 40 }).map((attempts) => stats(attempts, 0));
		fc.assert(
			fc.property(
				fc.array(playArb, { maxLength: 15 }),
				fc.array(cleanPlay, { minLength: 1, maxLength: 40 }),
				windowArb,
				(old, clean, recentCharWindow) => {
					fc.pre(clean.reduce((sum, play) => sum + play.attempts, 0) >= recentCharWindow);
					const rules: ProgressionRules = { ...RULES, recentCharWindow };
					let progress = emptyProgress();
					for (const play of [stats(20, 20), ...old, ...clean]) {
						progress = applyLessonResult(
							progress,
							resultOf('fr.lesson.a', 90, {}, { f: play }),
							rules
						);
					}
					expect(recentErrorRate(progress, 'f')).toBe(0);
					expect(recentCharStats(progress, 'f').attempts).toBeGreaterThanOrEqual(recentCharWindow);
					expect(progress.chars['f']?.errors).toBeGreaterThanOrEqual(20);
				}
			)
		);
	});
});

describe('applyCharResults', () => {
	it('updates the characters exactly as applyLessonResult does and leaves the lessons alone', () => {
		fc.assert(
			fc.property(
				fc.array(fc.dictionary(fc.constantFrom('f', 'j', 'é', ' '), playArb, { maxKeys: 4 }), {
					maxLength: 12
				}),
				windowArb,
				(plays, recentCharWindow) => {
					const rules: ProgressionRules = { ...RULES, recentCharWindow };
					let viaLesson = emptyProgress();
					let viaChars = emptyProgress();
					for (const perChar of plays) {
						const result = resultOf('fr.lesson.a', 90, {}, perChar);
						viaLesson = applyLessonResult(viaLesson, result, rules);
						viaChars = applyCharResults(viaChars, result.metrics, rules);
					}
					expect(viaChars.chars).toEqual(viaLesson.chars);
					expect(viaChars.lessons).toEqual({});
				}
			)
		);
	});

	it('keeps the lessons of the progress it receives', () => {
		const played = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		const next = applyCharResults(played, metricsWith({ perChar: { f: stats(5, 1) } }), RULES);
		expect(next.lessons).toBe(played.lessons);
		expect(recentCharStats(next, 'f')).toEqual({ attempts: 5, errors: 1 });
	});

	it('does not mutate the progress it receives', () => {
		const before = deepFreeze(
			applyResult(emptyProgress(), resultOf('fr.lesson.a', 90, {}, { f: stats(4, 1) }))
		);
		const snapshot = structuredClone(before);
		applyCharResults(before, deepFreeze(metricsWith({ perChar: { f: stats(5, 1) } })), RULES);
		expect(before).toEqual(snapshot);
	});
});

describe('recentCharStats and recentErrorRate', () => {
	const progress: ProgressState = {
		lessons: {},
		chars: {
			f: {
				attempts: 100,
				errors: 60,
				recent: [
					{ attempts: 10, errors: 2 },
					{ attempts: 30, errors: 0 }
				]
			},
			j: { attempts: 0, errors: 0, recent: [] }
		}
	};

	it('adds up the recent samples and ignores the lifetime totals', () => {
		expect(recentCharStats(progress, 'f')).toEqual({ attempts: 40, errors: 2 });
		expect(recentErrorRate(progress, 'f')).toBe(0.05);
	});

	it('gives zeros for a character that was never typed or never met', () => {
		for (const char of ['j', 'k', 'constructor', '__proto__', 'toString']) {
			expect(recentCharStats(progress, char)).toEqual({ attempts: 0, errors: 0 });
			expect(recentErrorRate(progress, char)).toBe(0);
		}
		expect(recentCharStats(emptyProgress(), 'f')).toEqual({ attempts: 0, errors: 0 });
	});

	it('gives a rate of 1 when every recent keystroke was wrong', () => {
		const wrong: ProgressState = {
			lessons: {},
			chars: { f: { attempts: 50, errors: 5, recent: [{ attempts: 5, errors: 5 }] } }
		};
		expect(recentErrorRate(wrong, 'f')).toBe(1);
	});

	it('keeps the rate between 0 and 1 and equal to recent errors over recent attempts', () => {
		fc.assert(
			fc.property(fc.array(playArb, { maxLength: 20 }), windowArb, (plays, recentCharWindow) => {
				const rules: ProgressionRules = { ...RULES, recentCharWindow };
				let state = emptyProgress();
				for (const play of plays) {
					state = applyLessonResult(state, resultOf('fr.lesson.a', 90, {}, { f: play }), rules);
				}
				const recent = recentCharStats(state, 'f');
				const rate = recentErrorRate(state, 'f');
				expect(rate).toBeGreaterThanOrEqual(0);
				expect(rate).toBeLessThanOrEqual(1);
				expect(rate).toBe(recent.attempts === 0 ? 0 : recent.errors / recent.attempts);
				expect(recent.attempts).toBe(total(state.chars['f']?.recent ?? []));
			})
		);
	});
});

describe('isLessonPassed', () => {
	it('is false for a lesson that was never played or does not exist', () => {
		expect(isLessonPassed(RULES, emptyProgress(), 'fr.lesson.a')).toBe(false);
		expect(isLessonPassed(RULES, emptyProgress(), 'toString')).toBe(false);
	});

	it('is true from the unlock accuracy on, and not below', () => {
		const almost = applyResult(emptyProgress(), resultOf('fr.lesson.a', 79.99));
		expect(isLessonPassed(RULES, almost, 'fr.lesson.a')).toBe(false);
		const enough = applyResult(emptyProgress(), resultOf('fr.lesson.a', 80));
		expect(isLessonPassed(RULES, enough, 'fr.lesson.a')).toBe(true);
		expect(isLessonPassed(RULES, enough, 'fr.lesson.b')).toBe(false);
	});

	it('stays true after a worse play', () => {
		let progress = applyResult(emptyProgress(), resultOf('fr.lesson.a', 95));
		progress = applyResult(progress, resultOf('fr.lesson.a', 10));
		expect(isLessonPassed(RULES, progress, 'fr.lesson.a')).toBe(true);
	});

	it('agrees with the evaluation of the play, whatever the accuracy and the threshold', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 200 }),
				fc.integer({ min: 0, max: 200 }),
				fc.integer({ min: 0, max: 100 }),
				(correct, wrong, unlockAccuracy) => {
					const rules: ProgressionRules = { ...RULES, unlockAccuracy };
					const metrics = metricsWith({ accuracy: computeAccuracy(correct, correct + wrong) });
					const evaluation = evaluateLesson(rules, metrics);
					const progress = applyLessonResult(
						emptyProgress(),
						{ lessonId: 'fr.lesson.a', metrics, evaluation, completedAt: 1 },
						rules
					);
					expect(isLessonPassed(rules, progress, 'fr.lesson.a')).toBe(evaluation.unlocksNext);
				}
			)
		);
	});

	it('is what opens the following lesson', () => {
		const ids = ['fr.lesson.a', 'fr.lesson.b', 'fr.lesson.c'];
		const played = fc.record({
			lessonIndex: fc.integer({ min: 0, max: 2 }),
			accuracy: fc.double({ min: 0, max: 100, noNaN: true })
		});
		fc.assert(
			fc.property(fc.array(played, { maxLength: 8 }), (plays) => {
				let progress = emptyProgress();
				for (const { lessonIndex, accuracy } of plays) {
					progress = applyResult(progress, resultOf(ids[lessonIndex] as string, accuracy));
				}
				ids.slice(1).forEach((id, index) => {
					expect(isLessonUnlocked(PROGRESSION, progress, id)).toBe(
						isLessonPassed(PROGRESSION.rules, progress, ids[index] as string)
					);
				});
			})
		);
	});
});

describe('isLessonUnlocked', () => {
	it('always opens the first lesson', () => {
		expect(isLessonUnlocked(PROGRESSION, emptyProgress(), 'fr.lesson.a')).toBe(true);
	});

	it('keeps the other lessons closed until the previous one is mastered', () => {
		const progress = emptyProgress();
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.b')).toBe(false);
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.c')).toBe(false);
	});

	it('opens the next lesson at the unlock accuracy and not below', () => {
		const almost = applyResult(emptyProgress(), resultOf('fr.lesson.a', 79));
		expect(isLessonUnlocked(PROGRESSION, almost, 'fr.lesson.b')).toBe(false);
		const enough = applyResult(emptyProgress(), resultOf('fr.lesson.a', 80));
		expect(isLessonUnlocked(PROGRESSION, enough, 'fr.lesson.b')).toBe(true);
	});

	it('uses the best accuracy, so a worse attempt never closes a lesson again', () => {
		let progress = applyResult(emptyProgress(), resultOf('fr.lesson.a', 95));
		progress = applyResult(progress, resultOf('fr.lesson.a', 20));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.b')).toBe(true);
	});

	it('follows the flattened order across worlds', () => {
		let progress = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.c')).toBe(false);
		progress = applyResult(progress, resultOf('fr.lesson.b', 90));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.c')).toBe(true);
	});

	it('does not open a lesson because a later one was played', () => {
		const progress = applyResult(emptyProgress(), resultOf('fr.lesson.c', 100));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.b')).toBe(false);
	});

	it('treats an unknown lesson as locked', () => {
		expect(isLessonUnlocked(PROGRESSION, emptyProgress(), 'fr.lesson.zzz')).toBe(false);
	});

	it('uses the unlock accuracy of the progression', () => {
		const strict = { ...PROGRESSION, rules: { ...PROGRESSION.rules, unlockAccuracy: 95 } };
		const progress = applyResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		expect(isLessonUnlocked(strict, progress, 'fr.lesson.b')).toBe(false);
	});
});

describe('shipped progressions', () => {
	it.each(loadShippedProgressions().map((shipped) => [shipped.file, shipped.progression] as const))(
		'%s: is playable from the first lesson to the last without a speed requirement',
		(_file, progression) => {
			const ids = progression.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.id));
			let progress = emptyProgress();
			ids.forEach((id, index) => {
				expect(isLessonUnlocked(progression, progress, id)).toBe(true);
				const metrics = metricsWith({ accuracy: progression.rules.unlockAccuracy });
				progress = applyLessonResult(
					progress,
					{
						lessonId: id,
						metrics,
						evaluation: evaluateLesson(progression.rules, metrics),
						completedAt: index
					},
					progression.rules
				);
			});
			expect(Object.keys(progress.lessons)).toEqual(ids);
		}
	);
});

describe('almostNextStar', () => {
	const rules = { ...RULES, starThresholds: [80, 90, 95] as const, starAlmostMargin: 3 };

	it('is true just under the threshold of the next star', () => {
		expect(almostNextStar(rules, 92.9, 2)).toBe(true);
		expect(almostNextStar(rules, 87, 1)).toBe(true);
		expect(almostNextStar(rules, 77.5, 0)).toBe(true);
	});

	it('is false when the next star is far, reached, or the last one is won', () => {
		expect(almostNextStar(rules, 91.9, 2)).toBe(false);
		expect(almostNextStar(rules, 95, 2)).toBe(false);
		expect(almostNextStar(rules, 100, 3)).toBe(false);
	});

	it('is always false without a margin', () => {
		const { starAlmostMargin: _margin, ...without } = rules;
		void _margin;
		expect(almostNextStar(without, 94, 2)).toBe(false);
	});
});
