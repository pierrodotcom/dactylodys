import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfile, parseProfile } from '$lib/state/profile';
import type { SessionRecord } from '$lib/state/types';
import {
	keyboardSpeed,
	latestHandwriting,
	readHandwritingWords,
	targetStatus,
	withHandwritingSample
} from './target';

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
