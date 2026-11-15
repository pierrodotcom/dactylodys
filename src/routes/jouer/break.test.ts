import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { loadShippedProgressions } from '$lib/engine/progression/test-support';
import { SESSION_LENGTHS } from '$lib/state/profile';
import {
	createPlayClock,
	finishPlaying,
	isEarlyLesson,
	playedMsAt,
	shouldSuggestBreak,
	startPlaying,
	stopPlaying,
	withTyping
} from './break';
import { PLAY_RULES, type SessionLengthRules } from './play-rules';

const NORMAL: SessionLengthRules = {
	typingMinutes: 8,
	clockMinutes: 12,
	earlyExercises: 4,
	exercises: 0
};
const SHORT: SessionLengthRules = {
	typingMinutes: 5,
	clockMinutes: 8,
	earlyExercises: 4,
	exercises: 4
};
const LONG: SessionLengthRules = {
	typingMinutes: 12,
	clockMinutes: 15,
	earlyExercises: 6,
	exercises: 0
};
const MINUTE = 60_000;

describe('play clock', () => {
	it('starts with no play time', () => {
		expect(playedMsAt(createPlayClock(), 5_000)).toBe(0);
	});

	it('counts the time of the game in progress', () => {
		const clock = startPlaying(createPlayClock(), 1_000);

		expect(playedMsAt(clock, 4_000)).toBe(3_000);
	});

	it('adds up the games and ignores the time between them', () => {
		let clock = createPlayClock();
		clock = stopPlaying(startPlaying(clock, 0), 2 * MINUTE);
		clock = stopPlaying(startPlaying(clock, 10 * MINUTE), 13 * MINUTE);

		expect(playedMsAt(clock, 60 * MINUTE)).toBe(5 * MINUTE);
	});

	it('keeps the first start when started twice', () => {
		const clock = startPlaying(startPlaying(createPlayClock(), 1_000), 9_000);

		expect(playedMsAt(clock, 10_000)).toBe(9_000);
	});

	it('never goes backwards', () => {
		const clock = startPlaying(createPlayClock(), 5_000);

		expect(playedMsAt(clock, 1_000)).toBe(0);
	});
});

describe('finishPlaying', () => {
	it('counts the exercise, its time and what it typed', () => {
		const clock = finishPlaying(startPlaying(createPlayClock(), 0), 2 * MINUTE, 90_000);

		expect(clock.exercises).toBe(1);
		expect(clock.typedMs).toBe(90_000);
		expect(playedMsAt(clock, 60 * MINUTE)).toBe(2 * MINUTE);
	});

	it('does not count an exercise that is only stopped', () => {
		const clock = stopPlaying(startPlaying(createPlayClock(), 0), 2 * MINUTE);

		expect(clock.exercises).toBe(0);
		expect(clock.typedMs).toBe(0);
	});
});

describe('withTyping', () => {
	it('adds up what each play typed', () => {
		expect(withTyping(withTyping(createPlayClock(), 40_000), 25_000).typedMs).toBe(65_000);
	});

	it('counts nothing for a time that cannot be read', () => {
		const clock = withTyping(createPlayClock(), 40_000);
		for (const odd of [Number.NaN, -5, Number.POSITIVE_INFINITY, 0]) {
			expect(withTyping(clock, odd)).toBe(clock);
		}
	});
});

/** A clock of `exercises` finished exercises: `clockMinutes` in the games, `typingMinutes` typing. */
function played(clockMinutes: number, exercises: number, typingMinutes = 0) {
	let clock = createPlayClock();
	for (let index = 0; index < exercises; index++) {
		clock = finishPlaying(
			startPlaying(clock, 0),
			(clockMinutes * MINUTE) / exercises,
			(typingMinutes * MINUTE) / exercises
		);
	}
	return clock;
}

describe('shouldSuggestBreak in the first worlds', () => {
	it('stays quiet while neither the ceiling nor the number of exercises is reached', () => {
		expect(shouldSuggestBreak(createPlayClock(), 0, NORMAL, true)).toBe(false);
		expect(shouldSuggestBreak(played(12, 3), 0, NORMAL, true)).toBe(false);
	});

	it('suggests a break after the exercises of the rules, even if they were quick', () => {
		expect(shouldSuggestBreak(played(5, 4), 0, NORMAL, true)).toBe(true);
		expect(shouldSuggestBreak(played(5, 3), 0, NORMAL, true)).toBe(false);
	});

	it('does not look at the time spent typing: a beginner is counted in exercises', () => {
		expect(shouldSuggestBreak(played(11, 3, 10), 0, NORMAL, true)).toBe(false);
	});

	it('suggests a break once the ceiling is exceeded', () => {
		expect(shouldSuggestBreak(played(12.1, 2), 0, NORMAL, true)).toBe(true);
	});

	it('waits for more exercises in a long session', () => {
		expect(shouldSuggestBreak(played(5, 5), 0, LONG, true)).toBe(false);
		expect(shouldSuggestBreak(played(5, 6), 0, LONG, true)).toBe(true);
	});

	it('never counts exercises when the rules give none', () => {
		expect(shouldSuggestBreak(played(5, 20), 0, { ...NORMAL, earlyExercises: 0 }, true)).toBe(
			false
		);
	});
});

describe('shouldSuggestBreak after the first worlds', () => {
	it('no longer counts the exercises of the first worlds', () => {
		expect(shouldSuggestBreak(played(6, 9, 5), 0, NORMAL, false)).toBe(false);
	});

	it('suggests a break once the child has typed long enough', () => {
		expect(shouldSuggestBreak(played(10, 5, 7.9), 0, NORMAL, false)).toBe(false);
		expect(shouldSuggestBreak(played(10, 5, 8), 0, NORMAL, false)).toBe(true);
	});

	it('keeps the ceiling of time spent in the games, whatever was typed', () => {
		expect(shouldSuggestBreak(played(12, 5, 3), 0, NORMAL, false)).toBe(false);
		expect(shouldSuggestBreak(played(12.1, 5, 3), 0, NORMAL, false)).toBe(true);
	});

	it('follows the three lengths the adult can choose', () => {
		const typed = (minutes: number) => played(minutes, 3, minutes);
		expect(shouldSuggestBreak(typed(5), 0, SHORT, false)).toBe(true);
		expect(shouldSuggestBreak(typed(5), 0, NORMAL, false)).toBe(false);
		expect(shouldSuggestBreak(typed(8), 0, NORMAL, false)).toBe(true);
		expect(shouldSuggestBreak(typed(8), 0, LONG, false)).toBe(false);
		expect(shouldSuggestBreak(typed(12), 0, LONG, false)).toBe(true);
	});

	it('counts exercises too when the length gives some', () => {
		expect(shouldSuggestBreak(played(3, 4, 2), 0, SHORT, false)).toBe(true);
		expect(shouldSuggestBreak(played(3, 3, 2), 0, SHORT, false)).toBe(false);
	});

	it('never takes a break back: more of anything never makes it quiet again', () => {
		const amounts = fc.record({
			clock: fc.double({ min: 0, max: 30, noNaN: true }),
			typing: fc.double({ min: 0, max: 30, noNaN: true }),
			exercises: fc.integer({ min: 1, max: 20 })
		});
		fc.assert(
			fc.property(
				amounts,
				amounts,
				fc.constantFrom(SHORT, NORMAL, LONG),
				fc.boolean(),
				(a, b, length, early) => {
					const less = played(a.clock, a.exercises, a.typing);
					const more = played(a.clock + b.clock, a.exercises + b.exercises, a.typing + b.typing);
					if (shouldSuggestBreak(less, 0, length, early)) {
						expect(shouldSuggestBreak(more, 0, length, early)).toBe(true);
					}
				}
			)
		);
	});
});

describe('the rules of play as shipped', () => {
	const [shipped] = loadShippedProgressions();
	if (!shipped) throw new Error('no shipped progression');
	const { progression } = shipped;

	it('counts in exercises in the first two worlds only', () => {
		const early = progression.worlds.map((world) =>
			world.lessons.every((lesson) => isEarlyLesson(PLAY_RULES, progression, lesson.id))
		);
		expect(early).toEqual(progression.worlds.map((_, index) => index < 2));
		expect(isEarlyLesson(PLAY_RULES, progression, 'fr.lesson.unknown')).toBe(false);
	});

	it('keeps four exercises for a beginner, eight minutes of typing after, twelve at most', () => {
		expect(PLAY_RULES.sessionLengths.normal).toEqual(NORMAL);
	});

	it('proposes the break of a longer session no sooner than that of a shorter one', () => {
		const lengths = SESSION_LENGTHS.map((name) => PLAY_RULES.sessionLengths[name]);
		lengths.forEach((length, index) => {
			const shorter = lengths[index - 1];
			if (shorter === undefined) return;
			expect(length.typingMinutes).toBeGreaterThanOrEqual(shorter.typingMinutes);
			expect(length.clockMinutes).toBeGreaterThanOrEqual(shorter.clockMinutes);
		});
	});
});
