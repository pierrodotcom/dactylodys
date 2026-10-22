import { toGraphemes } from '../../engine/graphemes';
import type { GameState } from './game-state';

/**
 * Active time of a race: it runs only while a group is being typed, from its first keystroke, and
 * stops between groups and during the pause. `since` is the moment it last started, `null` when
 * it is stopped. Moments are milliseconds on the clock of the keystrokes.
 */
export interface RaceClock {
	readonly bankedMs: number;
	readonly since: number | null;
}

export const STOPPED_CLOCK: RaceClock = { bankedMs: 0, since: null };

export function clockMs(clock: RaceClock, now: number): number {
	return clock.since === null ? clock.bankedMs : clock.bankedMs + Math.max(0, now - clock.since);
}

function isRunning(state: GameState): boolean {
	return state.phase === 'typing' && !state.paused && state.session.startedAt !== null;
}

/** The clock after the game has moved to `state` at the moment `at`. */
export function followGame(clock: RaceClock, state: GameState, at: number): RaceClock {
	if (isRunning(state)) return clock.since === null ? { ...clock, since: at } : clock;
	return clock.since === null ? clock : { bankedMs: clockMs(clock, at), since: null };
}

/** Characters to type in the whole exercise, counted like the positions of a session. */
export function exerciseCharCount(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

/** Characters of the exercise already typed right. */
export function typedCharCount(state: GameState): number {
	const before = exerciseCharCount(state.groups.slice(0, state.groupIndex));
	const current = state.phase === 'typing' ? state.session.position : state.session.target.length;
	return before + current;
}
