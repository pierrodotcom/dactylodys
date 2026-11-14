import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfile, parseProfile } from '$lib/state/profile';
import type { SessionRecord } from '$lib/state/types';
import {
	keyboardSpeed,
	latestHandwriting,
	readHandwritingWords,
	speedSessions,
	targetStatus,
	withHandwritingSample
} from './target';

const RULES = { keyboardSpeedSessions: 5, keyboardSpeedMinCurrentRule: 3 };

/** A play whose speed counts the time before the first key of each group. */
function current(correctCharsPerMinute: number): SessionRecord {
	return { ...session(correctCharsPerMinute), speedRule: 2 };
}

function session(correctCharsPerMinute: number): SessionRecord {
	return {
		lessonId: 'fr.lesson.l',
		gameId: 'hatching',
		finishedAt: 1,
		utcOffsetMinutes: 0,
		durationMs: 60_000,
		totalKeystrokes: 10,
		correctKeystrokes: 10,
		errorCount: 0,
		accuracy: 100,
		correctCharsPerMinute,
		stars: 3,
		passed: true
	};
}

describe('keyboardSpeed', () => {
	it('takes the median of the most recent plays, in words per minute', () => {
		// 10, 20, 100 then 30, 40 words per minute: the last three give 100, 30, 40.
		const sessions = [50, 100, 500, 150, 200].map(session);
		expect(keyboardSpeed(sessions, 3)).toBe(40);
		expect(keyboardSpeed(sessions, 4)).toBe(35);
	});

	it('gives nothing without a play', () => {
		expect(keyboardSpeed([], 5)).toBeNull();
	});

	it('stays between the slowest and the fastest of the plays it reads', () => {
		fc.assert(
			fc.property(
				fc.array(fc.double({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 20 }),
				fc.integer({ min: 1, max: 25 }),
				(speeds, count) => {
					const read = speeds.slice(-count).map((cpm) => cpm / 5);
					const median = keyboardSpeed(speeds.map(session), count) ?? Number.NaN;
					expect(median).toBeGreaterThanOrEqual(Math.min(...read));
					expect(median).toBeLessThanOrEqual(Math.max(...read));
				}
			)
		);
	});
});

describe('speedSessions', () => {
	it('reads the most recent plays while none is measured the current way', () => {
		const sessions = [10, 20, 30, 40, 50, 60].map(session);
		expect(speedSessions(sessions, RULES)).toEqual(sessions.slice(1));
	});

	it('reads the most recent plays, whatever their rule, below the number it needs', () => {
		const sessions = [...[75, 75, 75, 75].map(session), ...[60, 60].map(current)];
		expect(speedSessions(sessions, RULES)).toEqual(sessions.slice(1));
	});

	it('reads only the plays measured the current way once there are enough of them', () => {
		const sessions = [...[75, 75, 75, 75].map(session), ...[60, 61, 62].map(current)];
		expect(speedSessions(sessions, RULES)).toEqual(sessions.slice(4));
		// Mixed, the median would lean on a play of the former rule: 62 instead of 61 characters.
		expect(keyboardSpeed(sessions, RULES.keyboardSpeedSessions)).toBe(12.4);
		const read = speedSessions(sessions, RULES);
		expect(keyboardSpeed(read, read.length)).toBe(12.2);
	});

	it('reads no more than the number of plays of the median', () => {
		const sessions = [60, 61, 62, 63, 64, 65, 66].map(current);
		expect(speedSessions(sessions, RULES)).toEqual(sessions.slice(2));
		expect(speedSessions(sessions, { ...RULES, keyboardSpeedSessions: 0 })).toEqual([]);
	});

	it('never mixes the two rules once enough plays are measured the current way', () => {
		fc.assert(
			fc.property(fc.array(fc.boolean(), { maxLength: 30 }), (marks) => {
				const sessions = marks.map((mark, index) => (mark ? current(index) : session(index)));
				const read = speedSessions(sessions, RULES);
				const enough = marks.filter(Boolean).length >= RULES.keyboardSpeedMinCurrentRule;
				expect(read.length).toBeLessThanOrEqual(RULES.keyboardSpeedSessions);
				if (enough) expect(read.every((one) => one.speedRule === 2)).toBe(true);
				else expect(read).toEqual(sessions.slice(-RULES.keyboardSpeedSessions));
			})
		);
	});
});

describe('targetStatus', () => {
	it('says what is missing before comparing', () => {
		expect(targetStatus(12, null)).toBe('no-measure');
		expect(targetStatus(null, 12)).toBe('no-play');
	});

	it('is reached once the keyboard is at least as fast as the hand', () => {
		expect(targetStatus(12, 12)).toBe('reached');
		expect(targetStatus(11.9, 12)).toBe('below');
	});
});

describe('readHandwritingWords', () => {
	it('accepts a whole number of words within the limits', () => {
		expect(readHandwritingWords(' 14 ', 1, 60)).toBe(14);
	});

	it.each(['0', '61', '12,5', 'douze', ''])('refuses "%s"', (text) => {
		expect(readHandwritingWords(text, 1, 60)).toBeNull();
	});
});

describe('withHandwritingSample', () => {
	const profile = createProfile({ id: 'p', name: 'Lou', now: 1, platform: 'pc' });

	it('adds the measure after the others and keeps a valid profile', () => {
		const once = withHandwritingSample(profile, { measuredAt: 10, wordsPerMinute: 12 });
		const twice = withHandwritingSample(once, { measuredAt: 20, wordsPerMinute: 14 });
		expect(() => parseProfile(twice)).not.toThrow();
		expect(latestHandwriting(twice.handwritingSamples)).toEqual({
			measuredAt: 20,
			wordsPerMinute: 14
		});
		expect(latestHandwriting(profile.handwritingSamples)).toBeNull();
	});

	it('refuses a speed that is not positive', () => {
		expect(() => withHandwritingSample(profile, { measuredAt: 1, wordsPerMinute: 0 })).toThrow();
	});
});
