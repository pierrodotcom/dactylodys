import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { SessionMetrics } from '../engine/types';
import {
	addPracticeDay,
	toSessionRecord,
	utcOffsetAt,
	withPracticeDay,
	withSessionRecorded,
	type FinishedPlay
} from './journal';
import { JOURNAL_RULES } from './journal-rules';
import { createProfile, isLocalDay, localDay, parseProfile } from './profile';
import {
	practiceDaysArb,
	profileArb,
	realisticInstantArb,
	sessionRecordArb,
	utcOffsetArb
} from './test-arbitraries';
import type { Profile, SessionRecord } from './types';

const NOV_4_2026_2330_UTC = Date.UTC(2026, 10, 4, 23, 30);
const NOV_5_2026_0030_UTC = Date.UTC(2026, 10, 5, 0, 30);

const METRICS: SessionMetrics = {
	elapsedMs: 61_234.6,
	totalKeystrokes: 40,
	correctKeystrokes: 38,
	errorCount: 2,
	accuracy: 95,
	correctCharsPerMinute: 37.2,
	wordsPerMinute: 7.44,
	perChar: { f: { attempts: 20, errors: 1, meanLatencyMs: 300 } }
};

function play(overrides: Partial<FinishedPlay> = {}): FinishedPlay {
	return {
		lessonId: 'fr.lesson.x',
		gameId: 'rocket',
		finishedAt: NOV_4_2026_2330_UTC,
		utcOffsetMinutes: 60,
		metrics: METRICS,
		evaluation: { stars: 2, unlocksNext: true },
		...overrides
	};
}

function newProfile(): Profile {
	return createProfile({ id: 'p-1', name: 'Léa', now: 1_700_000_000_000, platform: 'pc' });
}

function sessionAt(finishedAt: number, utcOffsetMinutes = 0): SessionRecord {
	return toSessionRecord(play({ finishedAt, utcOffsetMinutes }));
}

describe('localDay', () => {
	it('gives the day of the clock of the device, ahead of or behind UTC', () => {
		expect(localDay(NOV_4_2026_2330_UTC, 0)).toBe('2026-11-04');
		expect(localDay(NOV_4_2026_2330_UTC, 60)).toBe('2026-11-05');
		expect(localDay(NOV_5_2026_0030_UTC, -60)).toBe('2026-11-04');
		expect(localDay(NOV_5_2026_0030_UTC, 840)).toBe('2026-11-05');
	});

	it('gives the same day whatever the time zone it is computed in', () => {
		fc.assert(
			fc.property(realisticInstantArb, utcOffsetArb, (at, offset) => {
				const day = localDay(at, offset);
				expect(isLocalDay(day)).toBe(true);
				const local = new Date(at + offset * 60_000);
				expect(day).toBe(
					`${String(local.getUTCFullYear()).padStart(4, '0')}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`
				);
			})
		);
	});

	it.each([
		['a fractional offset', 0, 1.5],
		['an offset beyond the time zones', 0, 841],
		['an instant out of the calendar', 8.7e15, 0],
		['an instant past the year 9999', Date.UTC(10_000, 0, 1), 0]
	])('refuses %s', (_label, at, offset) => {
		expect(() => localDay(at, offset)).toThrow(RangeError);
	});
});

describe('isLocalDay', () => {
	it.each([
		['2024-02-29', true],
		['2023-02-29', false],
		['2026-13-01', false],
		['2026-1-04', false],
		['2026-11-04 ', false],
		[20261104, false]
	])('says whether %s is a day', (value, expected) => {
		expect(isLocalDay(value)).toBe(expected);
	});
});

describe('utcOffsetAt', () => {
	it('reads the offset of the device, as whole minutes ahead of UTC and never -0', () => {
		for (const at of [0, NOV_4_2026_2330_UTC, Date.UTC(2026, 6, 1)]) {
			const offset = utcOffsetAt(at);
			expect(offset).toBe(0 - new Date(at).getTimezoneOffset());
			expect(Number.isSafeInteger(offset)).toBe(true);
			expect(Object.is(offset, -0)).toBe(false);
		}
	});
});

describe('toSessionRecord', () => {
	it('keeps the totals of the play, its stars and whether it was passed, not the detail by key', () => {
		expect(toSessionRecord(play())).toEqual({
			lessonId: 'fr.lesson.x',
			gameId: 'rocket',
			finishedAt: NOV_4_2026_2330_UTC,
			utcOffsetMinutes: 60,
			durationMs: 61_235,
			totalKeystrokes: 40,
			correctKeystrokes: 38,
			errorCount: 2,
			accuracy: 95,
			correctCharsPerMinute: 37.2,
			stars: 2,
			passed: true
		});
	});

	it('records a play that was not passed as well', () => {
		const record = toSessionRecord(play({ evaluation: { stars: 0, unlocksNext: false } }));
		expect(record.stars).toBe(0);
		expect(record.passed).toBe(false);
	});

	it('refuses a play without its game', () => {
		expect(() => toSessionRecord(play({ gameId: '' }))).toThrow(/session\.gameId/);
	});
});

describe('addPracticeDay', () => {
	it('puts a new day in its place and gives back the same list for a day already there', () => {
		const days = ['2026-11-01', '2026-11-04'];
		expect(addPracticeDay(days, '2026-11-02')).toEqual(['2026-11-01', '2026-11-02', '2026-11-04']);
		expect(addPracticeDay(days, '2026-11-04')).toBe(days);
	});

	it('refuses what is not a day', () => {
		expect(() => addPracticeDay([], '4 novembre')).toThrow(RangeError);
	});

	it('keeps the days sorted, each once, and never loses one', () => {
		fc.assert(
			fc.property(practiceDaysArb, practiceDaysArb, (days, added) => {
				let result: readonly string[] = days;
				for (const day of added) result = addPracticeDay(result, day);
				expect(result).toEqual([...new Set([...days, ...added])].sort());
			})
		);
	});
});

describe('withPracticeDay', () => {
	it('counts the day of a play the journal does not keep', () => {
		const profile = withPracticeDay(newProfile(), '2026-11-04');
		expect(profile.practiceDays).toEqual(['2026-11-04']);
		expect(profile.sessions).toEqual([]);
		expect(withPracticeDay(profile, '2026-11-04')).toBe(profile);
	});
});

describe('withSessionRecorded', () => {
	it('adds the play after the others and counts its local day', () => {
		const first = withSessionRecorded(
			newProfile(),
			sessionAt(NOV_4_2026_2330_UTC, 0),
			JOURNAL_RULES
		);
		const second = withSessionRecorded(first, sessionAt(NOV_4_2026_2330_UTC, 60), JOURNAL_RULES);
		expect(second.sessions.map((session) => session.utcOffsetMinutes)).toEqual([0, 60]);
		expect(second.practiceDays).toEqual(['2026-11-04', '2026-11-05']);
	});

	it('does not change the profile it is given', () => {
		const profile = newProfile();
		withSessionRecorded(profile, sessionAt(NOV_4_2026_2330_UTC), JOURNAL_RULES);
		expect(profile.sessions).toEqual([]);
		expect(profile.practiceDays).toEqual([]);
	});

	it('drops the oldest plays beyond the limit, and keeps their days', () => {
		const rules = { maxSessions: 2 };
		let profile = newProfile();
		for (const day of [1, 2, 3]) {
			profile = withSessionRecorded(profile, sessionAt(Date.UTC(2026, 10, day, 12)), rules);
		}
		expect(profile.sessions.map((session) => session.finishedAt)).toEqual([
			Date.UTC(2026, 10, 2, 12),
			Date.UTC(2026, 10, 3, 12)
		]);
		expect(profile.practiceDays).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
	});

	it.each([0, -1, 1.5, Number.NaN])('refuses a limit of %s', (maxSessions) => {
		expect(() =>
			withSessionRecorded(newProfile(), sessionAt(NOV_4_2026_2330_UTC), { maxSessions })
		).toThrow(RangeError);
	});

	it('refuses a damaged play', () => {
		const damaged = { ...sessionAt(NOV_4_2026_2330_UTC), accuracy: 120 };
		expect(() => withSessionRecorded(newProfile(), damaged, JOURNAL_RULES)).toThrow(/accuracy/);
	});

	it('keeps at most the limit, always the most recent plays, and every day ever played', () => {
		fc.assert(
			fc.property(
				profileArb,
				fc.array(sessionRecordArb, { maxLength: 12 }),
				fc.integer({ min: 1, max: 5 }),
				(start, plays, maxSessions) => {
					let profile = start;
					for (const session of plays) {
						const before = profile;
						profile = withSessionRecorded(profile, session, { maxSessions });
						expect(profile.sessions.length).toBeLessThanOrEqual(maxSessions);
						expect(profile.sessions.at(-1)).toEqual(session);
						for (const day of before.practiceDays) expect(profile.practiceDays).toContain(day);
					}
					const everything = [...start.sessions, ...plays];
					const kept = plays.length === 0 ? start.sessions : everything.slice(-maxSessions);
					expect(profile.sessions).toEqual(kept);
					const days = plays.map((session) =>
						localDay(session.finishedAt, session.utcOffsetMinutes)
					);
					expect(profile.practiceDays).toEqual(
						[...new Set([...start.practiceDays, ...days])].sort()
					);
					expect(parseProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
				}
			)
		);
	});
});
