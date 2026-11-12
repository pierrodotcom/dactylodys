import { findLesson, learnedChars } from '$lib/engine/progression/definition';
import { fadedKeys } from '$lib/engine/progression/keyboard-fade';
import type { ProgressionDefinition, ProgressState } from '$lib/engine/progression/types';
import type { GameGuide, GameSettings } from '$lib/games/types';
import type { CharIndex, KeyCode } from '$lib/keyboard/types';
import type { Settings } from '$lib/state/types';

/** Whether movement is reduced: by the setting, or by the operating system when it is followed. */
export function isMotionReduced(settings: Settings, systemPrefersReduced: boolean): boolean {
	return settings.motion === 'reduced' || (settings.motion === 'system' && systemPrefersReduced);
}

/**
 * The keys whose letter fades in a game of this lesson (ADR-057): those whose characters learned
 * so far are all acquired, unless the adult turned it off or the progression fades nothing.
 */
export function fadedKeysFor(
	settings: Settings,
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string,
	charIndex: CharIndex
): KeyCode[] {
	const rules = progression.rules.keyboardFade;
	if (!settings.keyboardFade || rules === undefined) return [];
	if (findLesson(progression, lessonId) === undefined) return [];
	return fadedKeys(progress, learnedChars(progression, lessonId), charIndex, rules);
}

/** `motion: 'system'` follows the operating system preference, `systemPrefersReduced`. */
export function toGameSettings(
	settings: Settings,
	systemPrefersReduced: boolean,
	guide: GameGuide,
	lookReminderEvery = 0,
	scenes: readonly string[] = [],
	fadedKeys: readonly KeyCode[] = []
): GameSettings {
	return {
		reducedMotion: isMotionReduced(settings, systemPrefersReduced),
		showKeyboard: settings.showKeyboard,
		errorPolicy: settings.errorPolicy,
		guide,
		lookReminderEvery,
		// A surprise scene is a light effect (ADR-057): without effects, the plain entrance shows.
		scenes: settings.effects ? scenes : [],
		fadedKeys
	};
}
