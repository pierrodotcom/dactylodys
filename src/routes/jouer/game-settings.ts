import type { GameSettings } from '$lib/games/types';
import type { Settings } from '$lib/state/types';

/** `motion: 'system'` follows the operating system preference, `systemPrefersReduced`. */
export function toGameSettings(settings: Settings, systemPrefersReduced: boolean): GameSettings {
	return {
		soundEnabled: settings.soundEnabled,
		reducedMotion:
			settings.motion === 'reduced' || (settings.motion === 'system' && systemPrefersReduced),
		showKeyboard: settings.showKeyboard,
		errorPolicy: 'retry'
	};
}
