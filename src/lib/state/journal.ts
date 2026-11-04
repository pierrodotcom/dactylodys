import type { LessonEvaluation } from '../engine/progression/types';
import type { SessionMetrics } from '../engine/types';
import type { JournalRules } from './journal-rules';
import { isLocalDay, localDay, parseSessionRecord } from './profile';
import type { Profile, SessionRecord } from './types';

/** A play of a lesson that went to its end, as the play route knows it. */
export interface FinishedPlay {
	readonly lessonId: string;
	readonly gameId: string;
	readonly finishedAt: number;
	/** See `SessionRecord.utcOffsetMinutes`; `utcOffsetAt` gives it on this device. */
	readonly utcOffsetMinutes: number;
	readonly metrics: SessionMetrics;
	readonly evaluation: LessonEvaluation;
}

/**
 * Minutes this device is ahead of UTC at that instant, from its time zone: the only part of the
 * journal that reads the environment, kept apart so that everything else stays deterministic.
 */
export function utcOffsetAt(at: number): number {
	// `0 -` rather than a unary minus: UTC would otherwise give -0.
	return 0 - new Date(at).getTimezoneOffset();
}

/** What the journal keeps of a play: its totals, not the detail of each key. */
export function toSessionRecord(play: FinishedPlay): SessionRecord {
	const { metrics, evaluation } = play;
	return parseSessionRecord(
		{
			lessonId: play.lessonId,
			gameId: play.gameId,
			finishedAt: play.finishedAt,
			utcOffsetMinutes: play.utcOffsetMinutes,
			durationMs: Math.max(0, Math.round(metrics.elapsedMs)),
			totalKeystrokes: metrics.totalKeystrokes,
			correctKeystrokes: metrics.correctKeystrokes,
			errorCount: metrics.errorCount,
			accuracy: metrics.accuracy,
			correctCharsPerMinute: metrics.correctCharsPerMinute,
			stars: evaluation.stars,
			passed: evaluation.unlocksNext
		},
		'session'
	);
}

/** The days with this one added in its place; the same list when it is already there. */
export function addPracticeDay(days: readonly string[], day: string): readonly string[] {
	if (!isLocalDay(day)) throw new RangeError(`not a day written YYYY-MM-DD: ${day}`);
	if (days.includes(day)) return days;
	return [...days, day].sort();
}

/** The day of a play is counted, even when the play itself is not kept in the journal. */
export function withPracticeDay(profile: Profile, day: string): Profile {
	const practiceDays = addPracticeDay(profile.practiceDays, day);
	return practiceDays === profile.practiceDays ? profile : { ...profile, practiceDays };
}

/**
 * The profile after one more finished play: the play goes after the others, only the
 * `rules.maxSessions` most recent are kept, and its local day is counted for good.
 */
export function withSessionRecorded(
	profile: Profile,
	session: SessionRecord,
	rules: JournalRules
): Profile {
	if (!Number.isSafeInteger(rules.maxSessions) || rules.maxSessions < 1) {
		throw new RangeError('maxSessions must be a positive integer');
	}
	const record = parseSessionRecord(session, 'session');
	const sessions = [...profile.sessions, record].slice(-rules.maxSessions);
	const day = localDay(record.finishedAt, record.utcOffsetMinutes);
	return withPracticeDay({ ...profile, sessions }, day);
}
