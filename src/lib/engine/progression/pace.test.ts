import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { medianPace, pacedTargetLength } from './pace';
import type { LessonDefinition, ProgressionRules } from './types';

/** Rules of a progression whose exercises keep the length of their lesson. */
const PLAIN: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 95],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 5,
	recentCharWindow: 30
};

const RULES: ProgressionRules = {
	...PLAIN,
	targetMinutes: 2,
	maxTargetLength: 150,
	paceRecentPlays: 5,
	paceMinPlays: 3,
	maxGroupCount: 12,
	extraWordsPerGroup: 2
};

const LESSON: LessonDefinition = {
	id: 'fr.lesson.test',
	title: 'Test',
	intro: 'Intro.',
	newChars: [],
	words: [],
	mix: { drills: 1, words: 2, phrases: 5 },
	unlocks: [],
	groupCount: 8,
	targetLength: 35,
	groupLength: [4, 6]
};

const PACES = fc.array(fc.double({ min: 0, max: 400, noNaN: true }), { maxLength: 12 });

describe('medianPace', () => {
	it('is the median of the latest plays the rules look at', () => {
		expect(medianPace(RULES, [10, 200, 30, 50, 40, 20, 60])).toBe(40);
		expect(medianPace(RULES, [30, 50, 40, 20])).toBe(35);
	});

	it('has no pace for a child with fewer plays than the rules ask', () => {
		expect(medianPace(RULES, [40, 50])).toBeUndefined();
		expect(medianPace(RULES, [])).toBeUndefined();
		expect(medianPace(RULES, undefined)).toBeUndefined();
	});

	it('leaves out the plays without a readable pace', () => {
		expect(medianPace(RULES, [40, 0, Number.NaN, 50, Number.POSITIVE_INFINITY])).toBeUndefined();
		expect(medianPace(RULES, [40, 0, 50, -3, 60])).toBe(50);
	});

	it('has no pace without rules for it', () => {
		expect(medianPace(PLAIN, [40, 50, 60])).toBeUndefined();
	});
});

describe('pacedTargetLength', () => {
	it('aims at what the median pace types in the minutes of the rules', () => {
		expect(pacedTargetLength(RULES, LESSON, [40, 40, 40])).toBe(80);
		expect(pacedTargetLength(RULES, LESSON, [30, 50, 61])).toBe(100);
	});

	it('keeps the length of the lesson for a beginner and for a slow pace', () => {
		expect(pacedTargetLength(RULES, LESSON, [80, 90])).toBe(35);
		expect(pacedTargetLength(RULES, LESSON, undefined)).toBe(35);
		expect(pacedTargetLength(RULES, LESSON, [12, 15, 14])).toBe(35);
	});

	it('stops at the ceiling of the rules', () => {
		expect(pacedTargetLength(RULES, LESSON, [300, 300, 300])).toBe(150);
	});

	it('gets shorter again as soon as the child slows down', () => {
		expect(pacedTargetLength(RULES, LESSON, [60, 60, 60, 60, 60])).toBe(120);
		expect(pacedTargetLength(RULES, LESSON, [60, 60, 30, 30, 30])).toBe(60);
	});

	it('keeps the length of the lesson without rules for it', () => {
		expect(pacedTargetLength(PLAIN, LESSON, [60, 60, 60])).toBe(35);
		// A pace that can be read is not enough: the minutes aimed at are needed too.
		const paceOnly = { ...PLAIN, paceRecentPlays: 5, paceMinPlays: 3, maxTargetLength: 150 };
		expect(medianPace(paceOnly, [60, 60, 60])).toBe(60);
		expect(pacedTargetLength(paceOnly, LESSON, [60, 60, 60])).toBe(35);
	});

	it('is never under the length of the lesson nor above the ceiling', () => {
		fc.assert(
			fc.property(PACES, (paces) => {
				const aimed = pacedTargetLength(RULES, LESSON, paces);
				expect(aimed).toBeGreaterThanOrEqual(LESSON.targetLength);
				expect(aimed).toBeLessThanOrEqual(150);
			})
		);
	});

	it('never gets shorter when every play is faster', () => {
		fc.assert(
			fc.property(PACES, fc.double({ min: 1, max: 3, noNaN: true }), (paces, factor) => {
				const faster = paces.map((pace) => pace * factor);
				expect(pacedTargetLength(RULES, LESSON, faster)).toBeGreaterThanOrEqual(
					pacedTargetLength(RULES, LESSON, paces)
				);
			})
		);
	});
});
