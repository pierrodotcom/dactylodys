import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	aidedContext,
	isCloseToPassing,
	supportLevel,
	type LessonPlay,
	type SupportRules
} from './support';
import type { ExerciseContext, ProgressionRules } from './types';

const RULES: SupportRules = { afterFailedPlays: 2, closeMargin: 3, wordLevel: 1 };
const PROGRESSION_RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 95],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 5,
	recentCharWindow: 30
};
const LESSON = 'fr.lesson.v-b';
const OTHER = 'fr.lesson.g-h';

function failed(lessonId = LESSON): LessonPlay {
	return { lessonId, passed: false };
}

function passed(lessonId = LESSON): LessonPlay {
	return { lessonId, passed: true };
}

describe('supportLevel', () => {
	it('aids the next play of a lesson after two plays of it in a row under the threshold', () => {
		expect(supportLevel([], LESSON, RULES)).toBe('none');
		expect(supportLevel([failed()], LESSON, RULES)).toBe('none');
		expect(supportLevel([failed(), failed()], LESSON, RULES)).toBe('aided');
		expect(supportLevel([failed(), failed(), failed()], LESSON, RULES)).toBe('aided');
	});

	it('stops aiding as soon as a play of the lesson succeeds', () => {
		expect(supportLevel([failed(), failed(), passed()], LESSON, RULES)).toBe('none');
		expect(supportLevel([failed(), failed(), passed(), failed()], LESSON, RULES)).toBe('none');
		expect(supportLevel([passed(), failed(), failed()], LESSON, RULES)).toBe('aided');
	});

	it('counts the plays of this lesson only, whatever was played in between', () => {
		const plays = [failed(), passed(OTHER), failed(OTHER), failed()];

		expect(supportLevel(plays, LESSON, RULES)).toBe('aided');
		expect(supportLevel(plays, OTHER, RULES)).toBe('none');
		expect(supportLevel([failed(OTHER), failed(OTHER)], LESSON, RULES)).toBe('none');
	});

	it('follows the number of plays of the rules', () => {
		expect(supportLevel([failed()], LESSON, { ...RULES, afterFailedPlays: 1 })).toBe('aided');
		expect(supportLevel([failed(), failed()], LESSON, { ...RULES, afterFailedPlays: 3 })).toBe(
			'none'
		);
	});

	it('aids exactly when the latest plays of the lesson are all under the threshold', () => {
		const play = fc.record({
			lessonId: fc.constantFrom(LESSON, OTHER),
			passed: fc.boolean()
		});
		fc.assert(
			fc.property(fc.array(play, { maxLength: 12 }), (plays) => {
				const own = plays.filter((item) => item.lessonId === LESSON);
				const latest = own.slice(-RULES.afterFailedPlays);
				const expected =
					latest.length === RULES.afterFailedPlays && latest.every((item) => !item.passed);
				expect(supportLevel(plays, LESSON, RULES)).toBe(expected ? 'aided' : 'none');
				// A play that succeeds ends the help, whatever came before it.
				expect(supportLevel([...plays, passed()], LESSON, RULES)).toBe('none');
			})
		);
	});
});

describe('aidedContext', () => {
	const CONTEXT: ExerciseContext = {
		maxLevel: 3,
		maxWordLength: 7,
		themeId: 'animaux',
		ageBand: '10-12',
		paces: [70, 70, 70, 70, 70]
	};

	it('takes the simplest words and leaves the pace of the child aside', () => {
		const aided = aidedContext(CONTEXT, RULES);

		expect(aided.maxLevel).toBe(1);
		expect(aided.paces).toBeUndefined();
		expect(aided.maxWordLength).toBe(7);
		expect(aided.themeId).toBe('animaux');
		expect(aided.ageBand).toBe('10-12');
	});

	it('never allows harder words than the context it is given', () => {
		expect(aidedContext({ maxLevel: 1 }, { ...RULES, wordLevel: 2 }).maxLevel).toBe(1);
		expect(aidedContext({}, { ...RULES, wordLevel: 2 }).maxLevel).toBe(2);
	});
});

describe('isCloseToPassing', () => {
	it('is close within the margin of the rules under the accuracy that opens the next lesson', () => {
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 79.5)).toBe(true);
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 77)).toBe(true);
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 76.9)).toBe(false);
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 40)).toBe(false);
	});

	it('is never close for a play that reached it', () => {
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 80)).toBe(false);
		expect(isCloseToPassing(PROGRESSION_RULES, RULES, 100)).toBe(false);
	});
});
