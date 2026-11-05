import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '$lib/state/types';
import { practiceWeeks, sessionPoints, wordsPerMinuteOf } from './evolution';

const MS_PER_DAY = 86_400_000;
const FIRST_DAY = Date.parse('2025-01-01T00:00:00Z') / MS_PER_DAY;
const ALL_WEEKS = 10_000;

function day(number: number): string {
	return new Date(number * MS_PER_DAY).toISOString().slice(0, 10);
}

function session(index: number, overrides: Partial<SessionRecord> = {}): SessionRecord {
	return {
		lessonId: `fr.lesson.l${index}`,
		gameId: 'hatching',
		finishedAt: 1_700_000_000_000 + index * 60_000,
		utcOffsetMinutes: 60,
		durationMs: 60_000,
		totalKeystrokes: 50,
		correctKeystrokes: 45,
		errorCount: 5,
		accuracy: 90,
		correctCharsPerMinute: 45,
		stars: 2,
		passed: true,
		...overrides
	};
}

describe('wordsPerMinuteOf', () => {
	it('counts five correct characters as a word', () => {
		expect(wordsPerMinuteOf(session(0, { correctCharsPerMinute: 60 }))).toBe(12);
	});
});

describe('sessionPoints', () => {
	it('keeps the most recent plays, oldest first, with their rank in the journal', () => {
		const points = sessionPoints(
			[0, 1, 2, 3, 4].map((index) => session(index)),
			3
		);
		expect(points.map((point) => point.rank)).toEqual([3, 4, 5]);
		expect(points[0]?.lessonId).toBe('fr.lesson.l2');
	});

	it('gives nothing without a play', () => {
		expect(sessionPoints([], 30)).toEqual([]);
	});
});

describe('practiceWeeks', () => {
	it('starts weeks on Monday and keeps the empty weeks', () => {
		// 2026-11-02 is a Monday.
		const weeks = practiceWeeks(['2026-10-27', '2026-10-28', '2026-11-05'], '2026-11-12', 10);
		expect(weeks).toEqual([
			{ weekStart: '2026-10-26', days: 2, cumulativeDays: 2 },
			{ weekStart: '2026-11-02', days: 1, cumulativeDays: 3 },
			{ weekStart: '2026-11-09', days: 0, cumulativeDays: 3 }
		]);
	});

	it('counts the days before the weeks it shows', () => {
		const weeks = practiceWeeks(['2026-10-27', '2026-11-05'], '2026-11-12', 1);
		expect(weeks).toEqual([{ weekStart: '2026-11-09', days: 0, cumulativeDays: 2 }]);
	});

	it('gives no week before the first day played', () => {
		expect(practiceWeeks([], '2026-11-12', 10)).toEqual([]);
	});

	it('never lowers the total, and counts every day once', () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 0, max: 800 }), { maxLength: 60 }),
				fc.integer({ min: 0, max: 60 }),
				(offsets, ahead) => {
					const days = offsets.map((offset) => day(FIRST_DAY + offset));
					const today = day(FIRST_DAY + Math.max(0, ...offsets) + ahead);
					const weeks = practiceWeeks(days, today, ALL_WEEKS);
					const distinct = new Set(days).size;
					weeks.forEach((week, index) => {
						expect(week.days).toBeLessThanOrEqual(7);
						const before = index === 0 ? 0 : (weeks[index - 1]?.cumulativeDays ?? 0);
						expect(week.cumulativeDays).toBe(before + week.days);
					});
					expect(weeks.at(-1)?.cumulativeDays ?? 0).toBe(distinct);
				}
			)
		);
	});
});
