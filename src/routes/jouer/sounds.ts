import { createSoundPlayer, type SoundPlayer, type SoundPlayerOptions } from '$lib/audio';
import type { Settings } from '$lib/state/types';

/** The one sound player of the play route: it is heard only while the current profile asks for sound. */
export function createProfileSounds(
	currentSettings: () => Pick<Settings, 'soundEnabled'> | null,
	options: Pick<SoundPlayerOptions, 'createContext'> = {}
): SoundPlayer {
	return createSoundPlayer({
		...options,
		isEnabled: () => currentSettings()?.soundEnabled ?? false
	});
}
