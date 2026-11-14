import { getContext, setContext } from 'svelte';

/** Hands over the way to pause the game on screen; returns how to take it back. */
export type PauseRegistration = (pause: () => void) => () => void;

const PAUSE_REQUESTS = Symbol('game-pause-requests');

/**
 * The route asks the game it shows for its way to pause, so that what leaves a screen (the Back
 * button of the browser) opens the pause of a game instead of losing it.
 */
export function providePauseRequests(register: PauseRegistration): void {
	setContext(PAUSE_REQUESTS, register);
}

/** For the shell of a game, while it is set up; without a route that asks, nothing is handed over. */
export function pauseRequests(): PauseRegistration {
	return getContext<PauseRegistration | undefined>(PAUSE_REQUESTS) ?? (() => () => {});
}
