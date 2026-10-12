import type { KeyCode } from '../../keyboard/types';
import { completedCount, type GameMood, type GamePhase, type GameState } from './game-state';

/** What a game skin gets to draw: the common state of every mini-game, nothing else. */
export interface GameView {
	readonly groups: readonly string[];
	/** Index of the current group; the last one once the game is over. */
	readonly groupIndex: number;
	/** Graphemes of the current group. */
	readonly group: readonly string[];
	/** Good keys typed in the current group. */
	readonly position: number;
	/** Groups whose reward has been earned. */
	readonly completed: number;
	readonly total: number;
	readonly phase: GamePhase;
	readonly mood: GameMood;
	/** Index in the group of the character that was mistyped, `null` when there is none. */
	readonly errorIndex: number | null;
	readonly wrongCode: KeyCode | null;
	/** Draw the new state only: no movement. */
	readonly reducedMotion: boolean;
}

export function viewOf(state: GameState, reducedMotion: boolean): GameView {
	return {
		groups: state.groups,
		groupIndex: state.groupIndex,
		group: state.session.target,
		position: state.session.position,
		completed: completedCount(state),
		total: state.groups.length,
		phase: state.phase,
		mood: state.mood,
		errorIndex: state.errorIndex,
		wrongCode: state.wrongCode,
		reducedMotion
	};
}

/** The group being typed has been typed to the end: its reward is on screen. */
export function isRewarded(view: GameView): boolean {
	return view.phase !== 'typing';
}

/** Item `index` of a list that starts over when it is used up, in order and without any chance. */
export function pickCyclic<T>(list: readonly T[], index: number): T | undefined {
	if (list.length === 0) return undefined;
	return list[((index % list.length) + list.length) % list.length];
}
