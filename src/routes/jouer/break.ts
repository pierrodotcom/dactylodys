import type { PlayRules } from './play-rules';

const MS_PER_MINUTE = 60_000;

/** Cumulated time spent playing since the page was opened (or since the last break). */
export interface PlayClock {
	readonly playedMs: number;
	/** Exercises finished so far. */
	readonly exercises: number;
	/** Start of the game in progress, `null` between two games. */
	readonly startedAt: number | null;
}

export function createPlayClock(): PlayClock {
	return { playedMs: 0, exercises: 0, startedAt: null };
}

export function startPlaying(clock: PlayClock, now: number): PlayClock {
	return clock.startedAt === null ? { ...clock, startedAt: now } : clock;
}

export function stopPlaying(clock: PlayClock, now: number): PlayClock {
	return { ...clock, playedMs: playedMsAt(clock, now), startedAt: null };
}

/** The game in progress is over: its time is counted, and so is the exercise. */
export function finishPlaying(clock: PlayClock, now: number): PlayClock {
	return { ...stopPlaying(clock, now), exercises: clock.exercises + 1 };
}

export function playedMsAt(clock: PlayClock, now: number): number {
	if (clock.startedAt === null) return clock.playedMs;
	return clock.playedMs + Math.max(0, now - clock.startedAt);
}

export function shouldSuggestBreak(clock: PlayClock, now: number, rules: PlayRules): boolean {
	const tooLong = playedMsAt(clock, now) > rules.breakAfterMinutes * MS_PER_MINUTE;
	const enough = rules.breakAfterExercises > 0 && clock.exercises >= rules.breakAfterExercises;
	return tooLong || enough;
}
