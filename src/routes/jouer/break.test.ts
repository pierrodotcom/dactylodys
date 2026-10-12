import { describe, expect, it } from 'vitest';
import {
	createPlayClock,
	playedMsAt,
	shouldSuggestBreak,
	startPlaying,
	stopPlaying
} from './break';
import type { PlayRules } from './play-rules';

const RULES: PlayRules = { breakAfterMinutes: 12, maxWordLevel: 3, keyboardCheckCodes: ['KeyQ'] };
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

describe('shouldSuggestBreak', () => {
	it('stays quiet until the delay of the rules is exceeded', () => {
		expect(shouldSuggestBreak(0, RULES)).toBe(false);
		expect(shouldSuggestBreak(12 * MINUTE, RULES)).toBe(false);
	});

	it('suggests a break once the delay is exceeded', () => {
		expect(shouldSuggestBreak(12 * MINUTE + 1, RULES)).toBe(true);
	});

	it('follows the delay given by the rules', () => {
		const shorter: PlayRules = { ...RULES, breakAfterMinutes: 5 };

		expect(shouldSuggestBreak(6 * MINUTE, shorter)).toBe(true);
		expect(shouldSuggestBreak(6 * MINUTE, RULES)).toBe(false);
	});
});
