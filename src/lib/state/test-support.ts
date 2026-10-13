import type { Profile } from './types';

/**
 * The record version 1 of the app stored for this profile. The fields are listed one by one so
 * that this stays the format of that time whatever is added to `Profile` later.
 */
export function asVersion1(profile: Profile): Record<string, unknown> {
	const { settings } = profile;
	return {
		schemaVersion: 1,
		id: profile.id,
		name: profile.name,
		createdAt: profile.createdAt,
		calibrated: profile.calibrated,
		settings: {
			layoutId: settings.layoutId,
			fingeringProfileId: settings.fingeringProfileId,
			soundEnabled: settings.soundEnabled,
			theme: settings.theme,
			motion: settings.motion,
			textScale: settings.textScale,
			textSpacing: settings.textSpacing,
			showKeyboard: settings.showKeyboard
		},
		progress: structuredClone(profile.progress)
	};
}
