import { describe, expect, it } from 'vitest';
import {
	createPlayClock,
	finishPlaying,
	playedMsAt,
	shouldSuggestBreak,
	startPlaying,
	stopPlaying
} from './break';
import type { PlayRules } from './play-rules';

const RULES: PlayRules = {
	breakAfterMinutes: 12,
	breakAfterExercises: 4,
	maxWordLevel: 3,
	bankLoadTimeoutMs: 3000,
	ghostPaceFactor: 0.9,
	lookReminderEveryGroups: 4,
	keyboardCheckCodes: ['KeyQ']
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
	it('counts the exercise and its time', () => {
		const clock = finishPlaying(startPlaying(createPlayClock(), 0), 2 * MINUTE);

		expect(clock.exercises).toBe(1);
		expect(playedMsAt(clock, 60 * MINUTE)).toBe(2 * MINUTE);
	});

	it('does not count an exercise that is only stopped', () => {
		const clock = stopPlaying(startPlaying(createPlayClock(), 0), 2 * MINUTE);

		expect(clock.exercises).toBe(0);
	});
});

/** A clock that has played `minutes` over `exercises` finished exercises. */
function played(minutes: number, exercises: number) {
	let clock = createPlayClock();
	for (let index = 0; index < exercises; index++) {
		clock = finishPlaying(startPlaying(clock, 0), (minutes * MINUTE) / exercises);
	}
	return clock;
}

describe('shouldSuggestBreak', () => {
	it('stays quiet while neither the time nor the number of exercises is reached', () => {
		expect(shouldSuggestBreak(createPlayClock(), 0, RULES)).toBe(false);
		expect(shouldSuggestBreak(played(12, 3), 0, RULES)).toBe(false);
	});

	it('suggests a break once the delay is exceeded', () => {
		expect(shouldSuggestBreak(played(12.1, 2), 0, RULES)).toBe(true);
	});

	it('suggests a break after the number of exercises of the rules, even if they were quick', () => {
		expect(shouldSuggestBreak(played(5, 4), 0, RULES)).toBe(true);
		expect(shouldSuggestBreak(played(5, 3), 0, RULES)).toBe(false);
	});

	it('never counts exercises when the rules give none', () => {
		const rules: PlayRules = { ...RULES, breakAfterExercises: 0 };

		expect(shouldSuggestBreak(played(5, 20), 0, rules)).toBe(false);
	});

	it('follows the delay given by the rules', () => {
		const shorter: PlayRules = { ...RULES, breakAfterMinutes: 5 };

		expect(shouldSuggestBreak(played(6, 2), 0, shorter)).toBe(true);
		expect(shouldSuggestBreak(played(6, 2), 0, RULES)).toBe(false);
	});
});
