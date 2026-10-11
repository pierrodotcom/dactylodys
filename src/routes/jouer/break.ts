import type { PlayRules } from './play-rules';

const MS_PER_MINUTE = 60_000;

/** Cumulated time spent playing since the page was opened (or since the last break). */
export interface PlayClock {
	readonly playedMs: number;
	/** Start of the game in progress, `null` between two games. */
	readonly startedAt: number | null;
}

export function createPlayClock(): PlayClock {
	return { playedMs: 0, startedAt: null };
}

export function startPlaying(clock: PlayClock, now: number): PlayClock {
	return clock.startedAt === null ? { ...clock, startedAt: now } : clock;
}

export function stopPlaying(clock: PlayClock, now: number): PlayClock {
	return { playedMs: playedMsAt(clock, now), startedAt: null };
}

export function playedMsAt(clock: PlayClock, now: number): number {
	if (clock.startedAt === null) return clock.playedMs;
	return clock.playedMs + Math.max(0, now - clock.startedAt);
}

export function shouldSuggestBreak(playedMs: number, rules: PlayRules): boolean {
	return playedMs > rules.breakAfterMinutes * MS_PER_MINUTE;
}
