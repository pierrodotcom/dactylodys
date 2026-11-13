import { sceneForGroup, type SceneChoice } from '../../engine/rewards/scenes';
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
	/**
	 * Wrong characters written after the good ones, waiting to be erased with Backspace, in the order
	 * they were typed (`backspace` policy only; always empty with `retry`).
	 */
	readonly pending: readonly string[];
	/**
	 * No key has been pressed in the current group yet: it has just appeared, empty or, in a lesson
	 * of repairs, already begun with mistakes to erase.
	 */
	readonly untouched: boolean;
	readonly wrongCode: KeyCode | null;
	/** Draw the new state only: no movement. */
	readonly reducedMotion: boolean;
	/**
	 * Rank of the current group among all the groups of this game the child has played: it goes on
	 * from one play to the next, so that a replayed game does not show the same things again.
	 */
	readonly rewardIndex: number;
	/** Rank of the first group of this play: what the progress rows add to their own indexes. */
	readonly playOffset: number;
	/** What the reward of the current group shows: a surprise scene, or a common entrance. */
	readonly scene: SceneChoice;
}

/**
 * With calm motion, no scene: the common entrance, which then fades in without moving.
 * `playCount` is the number of plays of this game the child has finished.
 */
export function viewOf(
	state: GameState,
	reducedMotion: boolean,
	scenes: readonly string[] = [],
	playCount = 0
): GameView {
	const plays = Number.isSafeInteger(playCount) && playCount > 0 ? playCount : 0;
	const playOffset = plays * state.groups.length;
	const rewardIndex = playOffset + state.groupIndex;
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
		pending: state.session.pending,
		untouched: state.session.records.length === 0,
		wrongCode: state.wrongCode,
		reducedMotion,
		rewardIndex,
		playOffset,
		scene: sceneForGroup(reducedMotion ? [] : scenes, rewardIndex)
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
