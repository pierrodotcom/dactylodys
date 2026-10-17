import type { GameGuide, GameSettings } from '$lib/games/types';
import type { Settings } from '$lib/state/types';

/** Whether movement is reduced: by the setting, or by the operating system when it is followed. */
export function isMotionReduced(settings: Settings, systemPrefersReduced: boolean): boolean {
	return settings.motion === 'reduced' || (settings.motion === 'system' && systemPrefersReduced);
}

/** `motion: 'system'` follows the operating system preference, `systemPrefersReduced`. */
export function toGameSettings(
	settings: Settings,
	systemPrefersReduced: boolean,
	guide: GameGuide,
	lookReminderEvery = 0,
	scenes: readonly string[] = []
): GameSettings {
	return {
		reducedMotion: isMotionReduced(settings, systemPrefersReduced),
		showKeyboard: settings.showKeyboard,
		errorPolicy: 'retry',
		guide,
		lookReminderEvery,
		scenes
	};
}
