import type { ProgressionDefinition } from '$lib/engine/progression/types';
import type { PlayRules, SessionLengthRules } from './play-rules';

const MS_PER_MINUTE = 60_000;

/** What was played since the page was opened (or since the last break): one session. */
export interface PlayClock {
	/** Time spent in the games, whatever was done there. */
	readonly playedMs: number;
	/** Time spent typing: the active time of the plays that went to their end (ADR-077). */
	readonly typedMs: number;
	/** Exercises finished so far. */
	readonly exercises: number;
	/** Start of the game in progress, `null` between two games. */
	readonly startedAt: number | null;
}

export function createPlayClock(): PlayClock {
	return { playedMs: 0, typedMs: 0, exercises: 0, startedAt: null };
}

export function startPlaying(clock: PlayClock, now: number): PlayClock {
	return clock.startedAt === null ? { ...clock, startedAt: now } : clock;
}

export function stopPlaying(clock: PlayClock, now: number): PlayClock {
	return { ...clock, playedMs: playedMsAt(clock, now), startedAt: null };
}

/** The time a play spent typing is added to the session; what cannot be read counts for nothing. */
export function withTyping(clock: PlayClock, typedMs: number): PlayClock {
	const added = Number.isFinite(typedMs) && typedMs > 0 ? typedMs : 0;
	return added === 0 ? clock : { ...clock, typedMs: clock.typedMs + added };
}

/** The game in progress is over: its time is counted, what it typed too, and so is the exercise. */
export function finishPlaying(clock: PlayClock, now: number, typedMs = 0): PlayClock {
	return { ...withTyping(stopPlaying(clock, now), typedMs), exercises: clock.exercises + 1 };
}

export function playedMsAt(clock: PlayClock, now: number): number {
	if (clock.startedAt === null) return clock.playedMs;
	return clock.playedMs + Math.max(0, now - clock.startedAt);
}

/**
 * The lesson is in one of the first worlds, where the break is proposed after a number of
 * exercises (`PlayRules.earlyWorlds`); never for a lesson the progression does not have.
 */
export function isEarlyLesson(
	rules: Pick<PlayRules, 'earlyWorlds'>,
	progression: ProgressionDefinition,
	lessonId: string
): boolean {
	const index = progression.worlds.findIndex((world) =>
		world.lessons.some((lesson) => lesson.id === lessonId)
	);
	return index >= 0 && index < rules.earlyWorlds;
}

/**
 * A break is proposed, never imposed: in the first worlds, after the exercises of the rules;
 * after them, once the child has typed long enough (and after the exercises of the rules, when
 * they give some); everywhere, once the time spent in the games goes beyond their ceiling.
 */
export function shouldSuggestBreak(
	clock: PlayClock,
	now: number,
	length: SessionLengthRules,
	early: boolean
): boolean {
	if (playedMsAt(clock, now) > length.clockMinutes * MS_PER_MINUTE) return true;
	const exercises = early ? length.earlyExercises : length.exercises;
	if (exercises > 0 && clock.exercises >= exercises) return true;
	return !early && clock.typedMs >= length.typingMinutes * MS_PER_MINUTE;
}
