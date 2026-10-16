import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyProgress, isLessonPassed } from '../progression/progress';
import type { ProgressState } from '../progression/types';
import type { CharStats } from '../types';
import { helpQuestFor, lessonPlays, parseHelpQuestRules } from './help-quest';
import {
	HELP_LESSON_HOME,
	HELP_LESSON_LATE,
	HELP_LESSON_SPACE,
	HELP_LESSON_WORDS,
	HELP_PROGRESSION,
	HELP_RULES,
	helpProgressArb,
	LESSON_A,
	LESSON_B,
	LESSON_C,
	playLesson,
	PROGRESSION,
	stats
} from './test-support';
import type { HelpQuestRules } from './types';

const SHIPPED = JSON.parse(readFileSync('content/common/help-quest.json', 'utf8')) as Record<
	string,
	unknown
>;

describe('parseHelpQuestRules', () => {
	it('reads the shipped rules', () => {
		expect(parseHelpQuestRules(SHIPPED)).toEqual(SHIPPED);
	});

	it('refuses what is not an object', () => {
		for (const data of [null, 3, 'x', [], undefined]) {
			expect(() => parseHelpQuestRules(data)).toThrow(/helpQuest: expected an object/);
		}
	});

	it('refuses an unknown property and names it', () => {
		expect(() => parseHelpQuestRules({ ...SHIPPED, extra: 1 })).toThrow(/helpQuest\.extra/);
	});

	it('refuses another schema version', () => {
		expect(() => parseHelpQuestRules({ ...SHIPPED, schemaVersion: 2 })).toThrow(
			/helpQuest\.schemaVersion/
		);
	});

	it.each(['minRecentAttempts', 'targetLength', 'minCharCount'])(
		'refuses a missing, fractional, zero or negative %s',
		(name) => {
			const without = { ...SHIPPED };
			delete without[name];
			expect(() => parseHelpQuestRules(without)).toThrow(new RegExp(`helpQuest\\.${name}`));
			for (const value of [1.5, 0, -2, '3', null, Number.NaN]) {
				expect(() => parseHelpQuestRules({ ...SHIPPED, [name]: value })).toThrow(
					new RegExp(`helpQuest\\.${name}`)
				);
			}
		}
	);

	it('accepts the smallest values', () => {
		const rules = parseHelpQuestRules({
			...SHIPPED,
			minRecentAttempts: 1,
			minCharCount: 1,
			targetLength: 1,
			maxErrorRate: 0
		});
		expect(rules).toMatchObject({ minRecentAttempts: 1, minCharCount: 1, maxErrorRate: 0 });
	});

	it('refuses an error rate outside 0 to 1, 1 excluded', () => {
		for (const value of [1, 1.5, -0.1, '0.2', null, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => parseHelpQuestRules({ ...SHIPPED, maxErrorRate: value })).toThrow(
				/helpQuest\.maxErrorRate/
			);
		}
	});

	it('refuses to ask a key more times than the exercise is long', () => {
		expect(() => parseHelpQuestRules({ ...SHIPPED, targetLength: 5, minCharCount: 6 })).toThrow(
			/helpQuest\.minCharCount/
		);
	});
});

describe('lessonPlays', () => {
	it('is zero for a new child', () => {
		expect(lessonPlays(emptyProgress())).toBe(0);
	});

	it('counts every play, repeats included', () => {
		let progress = playLesson(emptyProgress(), LESSON_A, 90);
		progress = playLesson(progress, LESSON_A, 20);
		progress = playLesson(progress, LESSON_B, 50);
		expect(lessonPlays(progress)).toBe(3);
	});
});

/** A progress where the lessons are passed and the keys have the given recent results. */
function progressWith(
	passed: readonly string[],
	perChar: Record<string, CharStats>
): ProgressState {
	let progress = emptyProgress();
	passed.forEach((lessonId, i) => {
		progress = playLesson(progress, lessonId, 90, i === 0 ? perChar : {});
	});
	return progress;
}

const quest = (progress: ProgressState, last = null as Parameters<typeof helpQuestFor>[3]) =>
	helpQuestFor(PROGRESSION, progress, HELP_RULES, last);

describe('helpQuestFor', () => {
	it('asks nothing of a new child', () => {
		expect(quest(emptyProgress())).toBeNull();
	});

	it('asks for a hard key of a passed lesson, with the lesson that teaches it', () => {
		const progress = progressWith([LESSON_A, LESSON_B], { d: stats(20, 10) });
		expect(quest(progress)).toEqual({ char: 'd', lessonId: LESSON_B });
	});

	it('never asks for a key of a lesson that is not passed', () => {
		let progress = playLesson(emptyProgress(), LESSON_A, 90, { f: stats(20, 2) });
		progress = playLesson(progress, LESSON_B, 50, { d: stats(20, 15) });
		expect(isLessonPassed(PROGRESSION.rules, progress, LESSON_B)).toBe(false);
		expect(quest(progress)).toBeNull();
	});

	it('asks nothing until the recent results cover enough keystrokes', () => {
		const few = progressWith([LESSON_A], { f: stats(HELP_RULES.minRecentAttempts - 1, 9) });
		expect(quest(few)).toBeNull();
		const enough = progressWith([LESSON_A], { f: stats(HELP_RULES.minRecentAttempts, 9) });
		expect(quest(enough)).toEqual({ char: 'f', lessonId: LESSON_A });
	});

	it('asks only when more than the allowed share was wrong', () => {
		const exactly = progressWith([LESSON_A], { f: stats(20, 4) });
		expect(HELP_RULES.maxErrorRate).toBe(0.2);
		expect(quest(exactly)).toBeNull();
		const above = progressWith([LESSON_A], { f: stats(20, 5) });
		expect(quest(above)).toEqual({ char: 'f', lessonId: LESSON_A });
	});

	it('reads the recent results, not the lifetime totals', () => {
		let progress = playLesson(emptyProgress(), LESSON_A, 90, { f: stats(30, 30) });
		expect(quest(progress)).toEqual({ char: 'f', lessonId: LESSON_A });
		progress = playLesson(progress, LESSON_A, 90, { f: stats(30, 0) });
		expect(progress.chars['f']?.errors).toBe(30);
		expect(quest(progress)).toBeNull();
	});

	it('picks the key with the highest error rate', () => {
		const progress = progressWith([LESSON_A, LESSON_B], {
			f: stats(20, 8),
			d: stats(20, 12),
			k: stats(20, 10)
		});
		expect(quest(progress)).toEqual({ char: 'd', lessonId: LESSON_B });
	});

	it('picks the first in the order of the progression on a tie', () => {
		const progress = progressWith([LESSON_A, LESSON_B], {
			k: stats(20, 10),
			d: stats(20, 10),
			j: stats(20, 10),
			f: stats(20, 10)
		});
		expect(quest(progress)).toEqual({ char: 'f', lessonId: LESSON_A });
	});

	it('never asks for a capital letter', () => {
		const progress = progressWith([LESSON_A, LESSON_B, LESSON_C], {
			F: stats(30, 30),
			S: stats(30, 30)
		});
		expect(quest(progress)).toBeNull();
	});

	it('asks for the space like any other key', () => {
		const progress = progressWith([HELP_LESSON_HOME, HELP_LESSON_SPACE], { ' ': stats(20, 10) });
		expect(helpQuestFor(HELP_PROGRESSION, progress, HELP_RULES, null)).toEqual({
			char: ' ',
			lessonId: HELP_LESSON_SPACE
		});
	});

	describe('between two quests', () => {
		const hard = progressWith([LESSON_A, LESSON_B], { d: stats(20, 12) });

		it('waits for another lesson to be played', () => {
			const last = { char: 'd', lessonPlays: lessonPlays(hard) };
			expect(quest(hard, last)).toBeNull();
			expect(quest(hard, { ...last, lessonPlays: lessonPlays(hard) + 3 })).toBeNull();
		});

		it('asks again after another lesson was played, even for the same key', () => {
			const last = { char: 'd', lessonPlays: lessonPlays(hard) };
			const next = playLesson(hard, LESSON_B, 90, { d: stats(20, 12) });
			expect(quest(next, last)).toEqual({ char: 'd', lessonId: LESSON_B });
		});

		it('asks at once when no quest was finished yet', () => {
			expect(quest(hard, null)).toEqual({ char: 'd', lessonId: LESSON_B });
		});
	});
});

describe('helpQuestFor properties', () => {
	const rulesArb: fc.Arbitrary<HelpQuestRules> = fc.record({
		schemaVersion: fc.constant(1 as const),
		minRecentAttempts: fc.integer({ min: 1, max: 40 }),
		maxErrorRate: fc.double({ min: 0, max: 0.99, noNaN: true }),
		targetLength: fc.constant(HELP_RULES.targetLength),
		minCharCount: fc.constant(HELP_RULES.minCharCount)
	});

	it('only ever names a key taught by a passed lesson, never a capital', () => {
		fc.assert(
			fc.property(helpProgressArb, rulesArb, (progress, rules) => {
				const found = helpQuestFor(HELP_PROGRESSION, progress, rules, null);
				if (found === null) return;
				const lesson = HELP_PROGRESSION.worlds
					.flatMap((world) => world.lessons)
					.find((candidate) => candidate.id === found.lessonId);
				expect(lesson?.newChars).toContain(found.char);
				expect(isLessonPassed(HELP_PROGRESSION.rules, progress, found.lessonId)).toBe(true);
				expect(found.char).toBe(found.char.toLowerCase());
			})
		);
	});

	it('names a key that really is hard on its recent results', () => {
		fc.assert(
			fc.property(helpProgressArb, rulesArb, (progress, rules) => {
				const found = helpQuestFor(HELP_PROGRESSION, progress, rules, null);
				if (found === null) return;
				const recent = progress.chars[found.char]?.recent ?? [];
				const attempts = recent.reduce((sum, sample) => sum + sample.attempts, 0);
				const errors = recent.reduce((sum, sample) => sum + sample.errors, 0);
				expect(attempts).toBeGreaterThanOrEqual(rules.minRecentAttempts);
				expect(errors / attempts).toBeGreaterThan(rules.maxErrorRate);
			})
		);
	});

	it('is null while no other lesson was played, whatever the progress', () => {
		fc.assert(
			fc.property(helpProgressArb, rulesArb, fc.nat(5), (progress, rules, back) => {
				const plays = lessonPlays(progress);
				const last = { char: 'f', lessonPlays: plays + back };
				expect(helpQuestFor(HELP_PROGRESSION, progress, rules, last)).toBeNull();
			})
		);
	});

	it('is deterministic and does not change the progress', () => {
		fc.assert(
			fc.property(helpProgressArb, rulesArb, (progress, rules) => {
				const snapshot = structuredClone(progress);
				const first = helpQuestFor(HELP_PROGRESSION, progress, rules, null);
				expect(helpQuestFor(HELP_PROGRESSION, progress, rules, null)).toEqual(first);
				expect(progress).toEqual(snapshot);
			})
		);
	});

	it('has the lessons of the support progression in this order', () => {
		const ids = HELP_PROGRESSION.worlds.flatMap((world) => world.lessons.map(({ id }) => id));
		expect(ids).toEqual([HELP_LESSON_HOME, HELP_LESSON_SPACE, HELP_LESSON_WORDS, HELP_LESSON_LATE]);
	});
});
