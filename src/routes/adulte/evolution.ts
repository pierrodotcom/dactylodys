import { CHARS_PER_WORD } from '$lib/engine/metrics';
import { isLocalDay } from '$lib/state/profile';
import type { SessionRecord } from '$lib/state/types';

const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
/* `getUTCDay` counts from Sunday: a week of the report starts on a Monday, as in ISO 8601. */
const MONDAY_SHIFT = 6;

/** Words per minute of a play, as `engine/metrics` defines them: correct characters / 5. */
export function wordsPerMinuteOf(session: SessionRecord): number {
	return session.correctCharsPerMinute / CHARS_PER_WORD;
}

/** One play of the evolution. */
export interface SessionPoint {
	/** Rank of the play among those the journal keeps, from 1. */
	readonly rank: number;
	readonly finishedAt: number;
	readonly utcOffsetMinutes: number;
	readonly lessonId: string;
	readonly accuracy: number;
	readonly wordsPerMinute: number;
}

/** The `count` most recent plays, oldest first. */
export function sessionPoints(
	sessions: readonly SessionRecord[],
	count: number
): readonly SessionPoint[] {
	const first = Math.max(0, sessions.length - Math.max(0, count));
	return sessions.slice(first).map((session, index) => ({
		rank: first + index + 1,
		finishedAt: session.finishedAt,
		utcOffsetMinutes: session.utcOffsetMinutes,
		lessonId: session.lessonId,
		accuracy: session.accuracy,
		wordsPerMinute: wordsPerMinuteOf(session)
	}));
}

/** The days played in one week, and in all the weeks up to it: a total that never goes down. */
export interface PracticeWeek {
	/** The Monday of the week, `YYYY-MM-DD`. */
	readonly weekStart: string;
	readonly days: number;
	readonly cumulativeDays: number;
}

function dayNumber(day: string): number {
	return Date.parse(`${day}T00:00:00Z`) / MS_PER_DAY;
}

function dayText(number: number): string {
	return new Date(number * MS_PER_DAY).toISOString().slice(0, 10);
}

function mondayOf(number: number): number {
	const weekday = new Date(number * MS_PER_DAY).getUTCDay();
	return number - ((weekday + MONDAY_SHIFT) % DAYS_PER_WEEK);
}

/**
 * Every week from the first day played to `today`, empty weeks included, and only the `count`
 * most recent ones; the total counts every day from the first one. No day played: no week.
 */
export function practiceWeeks(
	practiceDays: readonly string[],
	today: string,
	count: number
): readonly PracticeWeek[] {
	const days = [...new Set(practiceDays.filter(isLocalDay))].sort();
	const [firstDay] = days;
	if (firstDay === undefined || !isLocalDay(today)) return [];
	const lastDay = days.at(-1) ?? firstDay;
	const end = mondayOf(dayNumber(today > lastDay ? today : lastDay));
	const perWeek = new Map<number, number>();
	for (const day of days) {
		const monday = mondayOf(dayNumber(day));
		perWeek.set(monday, (perWeek.get(monday) ?? 0) + 1);
	}
	const weeks: PracticeWeek[] = [];
	let cumulativeDays = 0;
	for (let monday = mondayOf(dayNumber(firstDay)); monday <= end; monday += DAYS_PER_WEEK) {
		const played = perWeek.get(monday) ?? 0;
		cumulativeDays += played;
		weeks.push({ weekStart: dayText(monday), days: played, cumulativeDays });
	}
	return weeks.slice(Math.max(0, weeks.length - Math.max(0, count)));
}
