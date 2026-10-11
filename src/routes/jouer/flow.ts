export type Screen =
	| { readonly name: 'loading' }
	| { readonly name: 'players' }
	| { readonly name: 'new-player' }
	| { readonly name: 'keyboard-check' }
	| { readonly name: 'map' }
	| { readonly name: 'settings' }
	| { readonly name: 'intro'; readonly lessonId: string }
	| { readonly name: 'game'; readonly lessonId: string }
	| { readonly name: 'result'; readonly lessonId: string }
	| { readonly name: 'break' };

export type FlowEvent =
	| { readonly type: 'profiles-loaded' }
	| { readonly type: 'new-player' }
	| { readonly type: 'cancel-new-player' }
	| { readonly type: 'player-chosen'; readonly calibrated: boolean }
	| { readonly type: 'keyboard-checked' }
	| { readonly type: 'open-settings' }
	| { readonly type: 'close-settings' }
	| { readonly type: 'change-player' }
	| { readonly type: 'open-lesson'; readonly lessonId: string; readonly unlocked: boolean }
	| { readonly type: 'start' }
	| { readonly type: 'quit' }
	| { readonly type: 'completed' }
	| { readonly type: 'next-lesson'; readonly lessonId: string }
	| { readonly type: 'replay' }
	| { readonly type: 'back-to-map' }
	| { readonly type: 'take-break' };

export const INITIAL_SCREEN: Screen = { name: 'loading' };

/** Screens where leaving for the player list is allowed: never in the middle of a game. */
const CAN_CHANGE_PLAYER: ReadonlySet<Screen['name']> = new Set([
	'map',
	'settings',
	'intro',
	'result',
	'break',
	'keyboard-check'
]);

/** Pure screen automaton. An event that makes no sense on the current screen changes nothing. */
export function transition(screen: Screen, event: FlowEvent): Screen {
	if (event.type === 'change-player') {
		return CAN_CHANGE_PLAYER.has(screen.name) ? { name: 'players' } : screen;
	}

	switch (screen.name) {
		case 'loading':
			return event.type === 'profiles-loaded' ? { name: 'players' } : screen;
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
			if (event.type === 'open-settings') return { name: 'settings' };
			if (event.type === 'open-lesson' && event.unlocked) {
				return { name: 'intro', lessonId: event.lessonId };
			}
			return screen;
		case 'settings':
			return event.type === 'close-settings' ? { name: 'map' } : screen;
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
			return screen;
		case 'break':
			return event.type === 'back-to-map' ? { name: 'map' } : screen;
	}
}
