import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeAccuracy } from '../accuracy';
import type { CharStats, SessionMetrics } from '../types';
import { parseProgression } from './definition';
import { applyLessonResult, emptyProgress, evaluateLesson, isLessonUnlocked } from './progress';
import { deepFreeze, loadShippedProgressions } from './test-support';
import type {
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
	themeBoost: 2
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
			themeBoost: 0
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
		const next = applyLessonResult(
			emptyProgress(),
			resultOf('fr.lesson.a', 92, { completedAt: 5000 })
		);
		expect(next.lessons['fr.lesson.a']).toEqual({
			bestAccuracy: 92,
			stars: 2,
			attempts: 1,
			lastPlayedAt: 5000
		});
	});

	it('keeps the best accuracy and the best stars after a worse attempt', () => {
		const good = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 98));
		const worse = applyLessonResult(good, resultOf('fr.lesson.a', 70, { completedAt: 9000 }));
		expect(worse.lessons['fr.lesson.a']).toEqual({
			bestAccuracy: 98,
			stars: 3,
			attempts: 2,
			lastPlayedAt: 9000
		});
	});

	it('improves the best accuracy and the stars after a better attempt', () => {
		const first = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 82));
		const second = applyLessonResult(first, resultOf('fr.lesson.a', 91));
		expect(second.lessons['fr.lesson.a']).toMatchObject({
			bestAccuracy: 91,
			stars: 2,
			attempts: 2
		});
	});

	it('leaves the other lessons untouched', () => {
		const first = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		const second = applyLessonResult(first, resultOf('fr.lesson.b', 85));
		expect(second.lessons['fr.lesson.a']).toEqual(first.lessons['fr.lesson.a']);
		expect(Object.keys(second.lessons)).toEqual(['fr.lesson.a', 'fr.lesson.b']);
	});

	it('accumulates attempts and errors per character over sessions', () => {
		const first = applyLessonResult(
			emptyProgress(),
			resultOf('fr.lesson.a', 90, {}, { f: stats(10, 1), j: stats(8, 0) })
		);
		const second = applyLessonResult(
			first,
			resultOf('fr.lesson.b', 90, {}, { f: stats(5, 2), d: stats(4, 1) })
		);
		expect(second.chars).toEqual({
			f: { attempts: 15, errors: 3 },
			j: { attempts: 8, errors: 0 },
			d: { attempts: 4, errors: 1 }
		});
	});

	it('does not mutate the previous progress or the result', () => {
		const progress = deepFreeze(
			applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 85, {}, { f: stats(3, 1) }))
		);
		const result = deepFreeze(resultOf('fr.lesson.a', 95, {}, { f: stats(4, 0) }));
		const snapshot = structuredClone(progress);
		const next = applyLessonResult(progress, result);
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
					progress = deepFreeze(applyLessonResult(progress, result));
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
		const almost = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 79));
		expect(isLessonUnlocked(PROGRESSION, almost, 'fr.lesson.b')).toBe(false);
		const enough = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 80));
		expect(isLessonUnlocked(PROGRESSION, enough, 'fr.lesson.b')).toBe(true);
	});

	it('uses the best accuracy, so a worse attempt never closes a lesson again', () => {
		let progress = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 95));
		progress = applyLessonResult(progress, resultOf('fr.lesson.a', 20));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.b')).toBe(true);
	});

	it('follows the flattened order across worlds', () => {
		let progress = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 90));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.c')).toBe(false);
		progress = applyLessonResult(progress, resultOf('fr.lesson.b', 90));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.c')).toBe(true);
	});

	it('does not open a lesson because a later one was played', () => {
		const progress = applyLessonResult(emptyProgress(), resultOf('fr.lesson.c', 100));
		expect(isLessonUnlocked(PROGRESSION, progress, 'fr.lesson.b')).toBe(false);
	});

	it('treats an unknown lesson as locked', () => {
		expect(isLessonUnlocked(PROGRESSION, emptyProgress(), 'fr.lesson.zzz')).toBe(false);
	});

	it('uses the unlock accuracy of the progression', () => {
		const strict = { ...PROGRESSION, rules: { ...PROGRESSION.rules, unlockAccuracy: 95 } };
		const progress = applyLessonResult(emptyProgress(), resultOf('fr.lesson.a', 90));
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
				progress = applyLessonResult(progress, {
					lessonId: id,
					metrics,
					evaluation: evaluateLesson(progression.rules, metrics),
					completedAt: index
				});
			});
			expect(Object.keys(progress.lessons)).toEqual(ids);
		}
	);
});
