import type { StoryMoment } from '$lib/engine/story';

/** Where the child goes once the story told between two exercises is over. */
export type StoryDestination =
	| { readonly name: 'intro'; readonly lessonId: string }
	| { readonly name: 'map' }
	| { readonly name: 'break' }
	/** The lesson is played again: the page loads the game, then sends `replay`. */
	| { readonly name: 'replay'; readonly lessonId: string };

export type Screen =
	| { readonly name: 'loading' }
	| { readonly name: 'players' }
	| { readonly name: 'new-player' }
	| { readonly name: 'keyboard-check' }
	| { readonly name: 'map' }
	| { readonly name: 'settings'; readonly back: SettingsOrigin }
	| { readonly name: 'intro'; readonly lessonId: string }
	| { readonly name: 'game'; readonly lessonId: string }
	| { readonly name: 'result'; readonly lessonId: string }
	| { readonly name: 'break' }
	| { readonly name: 'companion'; readonly back: SettingsOrigin }
	/** The short game of a help quest: no lesson, no stars. */
	| { readonly name: 'help-game' }
	/** The companion says thank you after a help quest. */
	| { readonly name: 'help-done' }
	/** One moment of the story, said and drawn, between two exercises (ADR-042). */
	| {
			readonly name: 'story';
			readonly moments: readonly StoryMoment[];
			readonly index: number;
			readonly then: StoryDestination;
	  }
	/** The travel notebook: every moment already won (ADR-027). */
	| { readonly name: 'story-so-far' };

/**
 * Screens that the settings and the companion open from and come back to. A game paused for the
 * settings is kept as it was and given back (the companion does not open during a game).
 */
export type SettingsOrigin =
	| { readonly name: 'game'; readonly lessonId: string }
	| { readonly name: 'help-game' }
	| { readonly name: 'map' }
	| { readonly name: 'intro'; readonly lessonId: string }
	| { readonly name: 'result'; readonly lessonId: string }
	| { readonly name: 'break' }
	| { readonly name: 'help-done' };

export type FlowEvent =
	| { readonly type: 'profiles-loaded' }
	| { readonly type: 'new-player' }
	| { readonly type: 'cancel-new-player' }
	| { readonly type: 'player-chosen'; readonly calibrated: boolean }
	| { readonly type: 'keyboard-checked' }
	| { readonly type: 'open-settings' }
	| { readonly type: 'close-settings' }
	| { readonly type: 'open-companion' }
	| { readonly type: 'close-companion' }
	| { readonly type: 'start-help' }
	| { readonly type: 'change-player' }
	| { readonly type: 'open-lesson'; readonly lessonId: string; readonly unlocked: boolean }
	| { readonly type: 'start' }
	| { readonly type: 'quit' }
	| { readonly type: 'completed' }
	| { readonly type: 'next-lesson'; readonly lessonId: string }
	| { readonly type: 'replay' }
	| { readonly type: 'back-to-map' }
	| { readonly type: 'take-break' }
	| {
			readonly type: 'tell';
			readonly moments: readonly StoryMoment[];
			readonly then: StoryDestination;
	  }
	| { readonly type: 'story-next' }
	| { readonly type: 'open-story-so-far' };

export const INITIAL_SCREEN: Screen = { name: 'loading' };

/** Screens where leaving for the player list is allowed: never in the middle of a game. */
const CAN_CHANGE_PLAYER: ReadonlySet<Screen['name']> = new Set([
	'map',
	'settings',
	'intro',
	'result',
	'break',
	'keyboard-check',
	'companion',
	'help-done',
	'story-so-far'
]);

function originOf(screen: Screen): SettingsOrigin | null {
	switch (screen.name) {
		case 'map':
		case 'intro':
		case 'result':
		case 'break':
		case 'help-done':
			return screen;
		default:
			return null;
	}
}

function openSettings(screen: Screen): Screen {
	if (screen.name === 'game' || screen.name === 'help-game')
		return { name: 'settings', back: screen };
	const back = originOf(screen);
	return back === null ? screen : { name: 'settings', back };
}

function destination(then: StoryDestination, screen: Screen): Screen {
	return then.name === 'replay' ? screen : then;
}

/**
 * The story screen, or the destination at once when there is nothing to tell. A child who asks
 * for a break goes to it at once: the story waits in the notebook (`storySoFar`).
 */
function tell(moments: readonly StoryMoment[], then: StoryDestination, screen: Screen): Screen {
	return moments.length === 0 || then.name === 'break'
		? destination(then, screen)
		: { name: 'story', moments, index: 0, then };
}

function openCompanion(screen: Screen): Screen {
	const back = originOf(screen);
	return back === null ? screen : { name: 'companion', back };
}

/** Pure screen automaton. An event that makes no sense on the current screen changes nothing. */
export function transition(screen: Screen, event: FlowEvent): Screen {
	if (event.type === 'change-player') {
		return CAN_CHANGE_PLAYER.has(screen.name) ? { name: 'players' } : screen;
	}

	if (event.type === 'open-settings') return openSettings(screen);
	if (event.type === 'open-companion') return openCompanion(screen);

	switch (screen.name) {
		case 'loading':
			if (event.type === 'profiles-loaded') return { name: 'players' };
			if (event.type === 'player-chosen') {
				return { name: event.calibrated ? 'map' : 'keyboard-check' };
			}
			return screen;
		case 'players':
			if (event.type === 'new-player') return { name: 'new-player' };
			if (event.type === 'player-chosen') {
				return { name: event.calibrated ? 'map' : 'keyboard-check' };
			}
			return screen;
		case 'new-player':
			if (event.type === 'cancel-new-player') return { name: 'players' };
			if (event.type === 'player-chosen') {
				return { name: event.calibrated ? 'map' : 'keyboard-check' };
			}
			return screen;
		case 'keyboard-check':
			return event.type === 'keyboard-checked' ? { name: 'map' } : screen;
		case 'map':
			if (event.type === 'open-lesson' && event.unlocked) {
				return { name: 'intro', lessonId: event.lessonId };
			}
			if (event.type === 'start-help') return { name: 'help-game' };
			if (event.type === 'tell' && event.then.name === 'intro') {
				return tell(event.moments, event.then, screen);
			}
			if (event.type === 'open-story-so-far') return { name: 'story-so-far' };
			return screen;
		case 'settings':
			return event.type === 'close-settings' ? screen.back : screen;
		case 'companion':
			return event.type === 'close-companion' ? screen.back : screen;
		case 'intro':
			if (event.type === 'start') return { name: 'game', lessonId: screen.lessonId };
			if (event.type === 'back-to-map') return { name: 'map' };
			return screen;
		case 'game':
			if (event.type === 'quit') return { name: 'map' };
			if (event.type === 'completed') return { name: 'result', lessonId: screen.lessonId };
			return screen;
		case 'result':
			if (event.type === 'next-lesson') return { name: 'intro', lessonId: event.lessonId };
			if (event.type === 'replay') return { name: 'game', lessonId: screen.lessonId };
			if (event.type === 'back-to-map') return { name: 'map' };
			if (event.type === 'take-break') return { name: 'break' };
			if (event.type === 'tell') return tell(event.moments, event.then, screen);
			return screen;
		case 'break':
			return event.type === 'back-to-map' ? { name: 'map' } : screen;
		case 'help-game':
			if (event.type === 'quit') return { name: 'map' };
			if (event.type === 'completed') return { name: 'help-done' };
			return screen;
		case 'help-done':
			return event.type === 'back-to-map' ? { name: 'map' } : screen;
		case 'story':
			if (event.type === 'story-next') {
				return screen.index + 1 < screen.moments.length
					? { ...screen, index: screen.index + 1 }
					: destination(screen.then, screen);
			}
			if (event.type === 'replay' && screen.then.name === 'replay') {
				return { name: 'game', lessonId: screen.then.lessonId };
			}
			// The game of a replay could not be loaded.
			if (event.type === 'back-to-map') return { name: 'map' };
			return screen;
		case 'story-so-far':
			return event.type === 'back-to-map' ? { name: 'map' } : screen;
	}
}
