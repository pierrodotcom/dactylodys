import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CharProgress, ProgressState } from '../engine/progression/types';
import { CHAR_DAYS_RULES, withCharDay, withNewCharDays, type CharDaysRules } from './char-days';
import { createProfile, parseProfile, withProgress } from './profile';
import type { CharDay, Profile } from './types';

const RULES: CharDaysRules = { keptKeystrokes: 60, keptDays: 3 };

function day(attempts: number, errors: number, on: string | null): CharDay {
	return { day: on, attempts, errors };
}

function total(days: readonly CharDay[]): number {
	return days.reduce((sum, entry) => sum + entry.attempts, 0);
}

function profileWith(chars: Record<string, CharProgress>): Profile {
	const base = createProfile({ id: 'p', name: 'Lou', now: 0, platform: 'pc' });
	const progress: ProgressState = { lessons: {}, chars };
	return withProgress(base, progress);
}

function typed(attempts: number, errors: number): CharProgress {
	return { attempts, errors, recent: attempts > 0 ? [{ attempts, errors, latencyMs: null }] : [] };
}

describe('withCharDay', () => {
	it('starts the days of a key with its first one', () => {
		expect(withCharDay([], '2026-11-19', 12, 1, RULES)).toEqual([day(12, 1, '2026-11-19')]);
	});

	it('adds the keystrokes of a day to that day', () => {
		const days = [day(10, 0, '2026-11-18'), day(5, 1, '2026-11-19')];
		expect(withCharDay(days, '2026-11-19', 7, 2, RULES)).toEqual([
			day(10, 0, '2026-11-18'),
			day(12, 3, '2026-11-19')
		]);
	});

	it('keeps the days in order, even when the clock of the device went back', () => {
		const days = [day(10, 0, '2026-11-18'), day(5, 1, '2026-11-20')];
		expect(withCharDay(days, '2026-11-19', 3, 0, RULES)).toEqual([
			day(10, 0, '2026-11-18'),
			day(3, 0, '2026-11-19'),
			day(5, 1, '2026-11-20')
		]);
	});

	it('keeps the unknown day of version 17 first, apart from the days it knows', () => {
		const days = [day(30, 2, null)];
		expect(withCharDay(days, '2026-11-19', 4, 0, RULES)).toEqual([
			day(30, 2, null),
			day(4, 0, '2026-11-19')
		]);
	});

	it('leaves out the oldest days once the others cover the keystrokes and the days kept', () => {
		const days = [day(40, 0, '2026-11-15'), day(30, 0, '2026-11-16'), day(20, 0, '2026-11-17')];
		expect(withCharDay(days, '2026-11-18', 10, 0, RULES)).toEqual([
			day(30, 0, '2026-11-16'),
			day(20, 0, '2026-11-17'),
			day(10, 0, '2026-11-18')
		]);
	});

	it('keeps three days of a key typed a hundred times a day', () => {
		const days = [day(100, 0, '2026-11-15'), day(100, 0, '2026-11-16'), day(100, 0, '2026-11-17')];
		expect(withCharDay(days, '2026-11-18', 100, 3, RULES)).toEqual([
			day(100, 0, '2026-11-16'),
			day(100, 0, '2026-11-17'),
			day(100, 3, '2026-11-18')
		]);
	});

	it('keeps as many days as it takes to cover the keystrokes of a key typed little', () => {
		let days: readonly CharDay[] = [];
		for (let date = 1; date <= 20; date++) {
			days = withCharDay(days, `2026-11-${String(date).padStart(2, '0')}`, 5, 0, RULES);
		}
		expect(total(days)).toBe(RULES.keptKeystrokes);
		expect(days).toHaveLength(RULES.keptKeystrokes / 5);
		expect(days.at(-1)?.day).toBe('2026-11-20');
	});

	it('never keeps fewer keystrokes nor fewer days than the rules, nor more than it needs', () => {
		const playArb = fc.record({
			date: fc.integer({ min: 0, max: 40 }),
			attempts: fc.integer({ min: 1, max: 80 }),
			share: fc.double({ min: 0, max: 1, noNaN: true })
		});
		fc.assert(
			fc.property(fc.array(playArb, { maxLength: 40 }), (plays) => {
				let days: readonly CharDay[] = [];
				let all: CharDay[] = [];
				for (const play of plays) {
					const on = new Date(Date.UTC(2026, 10, 1 + play.date)).toISOString().slice(0, 10);
					const errors = Math.floor(play.share * play.attempts);
					days = withCharDay(days, on, play.attempts, errors, RULES);
					all = [
						...withCharDay(all, on, play.attempts, errors, {
							keptKeystrokes: Number.MAX_SAFE_INTEGER,
							keptDays: Number.MAX_SAFE_INTEGER
						})
					];
				}
				// What is kept is the most recent part of everything, day by day.
				expect(days).toEqual(all.slice(all.length - days.length));
				const sorted = days.map((entry) => entry.day ?? '');
				expect(sorted).toEqual([...new Set(sorted)].sort());
				const covered = total(days) >= RULES.keptKeystrokes && days.length >= RULES.keptDays;
				if (!covered) expect(days).toEqual(all);
				// Without its oldest day, it would no longer cover the rules.
				const rest = days.slice(1);
				expect(total(rest) >= RULES.keptKeystrokes && rest.length >= RULES.keptDays).toBe(false);
			})
		);
	});

	it('keeps more than the adult space needs to call a key acquired', () => {
		expect(CHAR_DAYS_RULES.keptKeystrokes).toBeGreaterThanOrEqual(40);
		expect(CHAR_DAYS_RULES.keptDays).toBeGreaterThanOrEqual(3);
	});
});

describe('withNewCharDays', () => {
	it('counts on the day what a play adds to the results of each key', () => {
		const before = profileWith({ f: typed(20, 1) });
		const after = withProgress(before, {
			lessons: {},
			chars: { f: typed(32, 2), j: typed(8, 0) }
		});
		const dated = withNewCharDays(before, after, '2026-11-19', RULES);
		expect(dated.charDays).toEqual({
			f: [day(12, 1, '2026-11-19')],
			j: [day(8, 0, '2026-11-19')]
		});
		expect(dated.progress).toBe(after.progress);
	});

	it('adds to the days the profile already holds', () => {
		const before = {
			...profileWith({ f: typed(20, 1) }),
			charDays: { f: [day(20, 1, '2026-11-18')] }
		};
		const after = withProgress(before, { lessons: {}, chars: { f: typed(25, 1) } });
		expect(withNewCharDays(before, after, '2026-11-19', RULES).charDays).toEqual({
			f: [day(20, 1, '2026-11-18'), day(5, 0, '2026-11-19')]
		});
	});

	it('changes nothing when no key was typed: a setting, a nickname, a world opened', () => {
		const before = { ...profileWith({ f: typed(20, 1) }), charDays: { f: [day(20, 1, null)] } };
		const after = { ...before, name: 'Noa' };
		expect(withNewCharDays(before, after, '2026-11-19', RULES)).toBe(after);
	});

	it('gives a valid profile, whatever the play added', () => {
		const statsArb = fc
			.record({ attempts: fc.nat({ max: 200 }), errors: fc.nat({ max: 200 }) })
			.map(({ attempts, errors }) => typed(attempts, Math.min(attempts, errors)));
		fc.assert(
			fc.property(statsArb, statsArb, (first, second) => {
				const before = profileWith({ f: first });
				const after = withProgress(before, { lessons: {}, chars: { f: second } });
				expect(() =>
					parseProfile(withNewCharDays(before, after, '2026-11-19', RULES))
				).not.toThrow();
			})
		);
	});
});
