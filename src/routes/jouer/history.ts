import type { Screen } from './flow';

/**
 * The Back button of the browser on `/jouer`, which is one address for every screen. A screen with
 * a way out adds one entry to the history, without changing the address (shallow routing): going
 * back lands on the entry of the route, and the screen takes its way out. The map, the players and
 * the loading screen have no way out: from them, Back leaves the game. The route never holds more
 * than that one entry, whatever the number of screens passed through; the entry stays under the
 * map once a lesson is left, and the next screen with a way out uses it again.
 */

/** What the way out of a screen does: its button at the top, Escape, and the Back button. */
export type WayBack =
	| 'cancel-new-player'
	| 'change-player'
	| 'close-settings'
	| 'close-companion'
	| 'close-hideout'
	| 'back-to-map'
	/** A game is never lost to the Back button: it pauses, and the child chooses. */
	| 'pause-game';

export function wayBackOf(screen: Screen): WayBack | null {
	switch (screen.name) {
		case 'loading':
		case 'players':
		case 'map':
			return null;
		case 'new-player':
			return 'cancel-new-player';
		case 'keyboard-check':
			return 'change-player';
		case 'settings':
			return 'close-settings';
		case 'companion':
			return 'close-companion';
		case 'hideout':
			return 'close-hideout';
		case 'game':
		case 'help-game':
		case 'free-game':
			return 'pause-game';
		case 'intro':
		case 'result':
		case 'break':
		case 'help-done':
		case 'story':
		case 'story-so-far':
		case 'free-intro':
		case 'free-done':
			return 'back-to-map';
	}
}

interface PlayPageState {
	readonly playGuard?: boolean;
}

/** The state of the entry a screen with a way out adds to the history. */
export const PLAY_GUARD: App.PageState = { playGuard: true } satisfies PlayPageState;

export function isPlayGuard(state: App.PageState): boolean {
	return (state as PlayPageState).playGuard === true;
}

/**
 * Whether the screen must add its entry to the history. `guarded`: the history is already on such
 * an entry, which is then used as it is.
 */
export function needsEntry(screen: Screen, guarded: boolean): boolean {
	return !guarded && wayBackOf(screen) !== null;
}

/**
 * `leave`: take the way out of the screen; `exit`: go back once more, out of the game; `undo`: go
 * back to where the history was.
 */
export type HistoryAnswer = 'leave' | 'exit' | 'undo' | 'none';

/**
 * What the route answers when the history changed entry. `guarded`: where the route left it;
 * `onGuard`: where it is now. Back takes the way out of the screen, or leaves the game from a
 * screen that has none. Forward onto an entry that no screen is waiting for is undone: the history
 * never plays anything again.
 */
export function answerToBrowser(screen: Screen, guarded: boolean, onGuard: boolean): HistoryAnswer {
	if (onGuard === guarded) return 'none';
	const hasWayBack = wayBackOf(screen) !== null;
	if (onGuard) return hasWayBack ? 'none' : 'undo';
	return hasWayBack ? 'leave' : 'exit';
}
