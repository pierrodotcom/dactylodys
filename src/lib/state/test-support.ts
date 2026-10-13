import type { ProgressState } from '../engine/progression/types';
import type { Profile } from './types';

/** The progress as versions 1 and 2 stored it: lifetime totals only for each character. */
function progressBeforeVersion3(progress: ProgressState): Record<string, unknown> {
	return {
		lessons: structuredClone(progress.lessons),
		chars: Object.fromEntries(
			Object.entries(progress.chars).map(([char, stats]) => [
				char,
				{ attempts: stats.attempts, errors: stats.errors }
			])
		)
	};
}

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
		progress: progressBeforeVersion3(profile.progress)
	};
}

/** The record version 2 of the app stored for this profile, listed field by field as well. */
export function asVersion2(profile: Profile): Record<string, unknown> {
	const { settings, companion } = profile;
	return {
		schemaVersion: 2,
		id: profile.id,
		name: profile.name,
		createdAt: profile.createdAt,
		calibrated: profile.calibrated,
		settings: {
			layoutId: settings.layoutId,
			fingeringProfileId: settings.fingeringProfileId,
			soundEnabled: settings.soundEnabled,
			voiceEnabled: settings.voiceEnabled,
			theme: settings.theme,
			motion: settings.motion,
			textScale: settings.textScale,
			textSpacing: settings.textSpacing,
			showKeyboard: settings.showKeyboard
		},
		progress: progressBeforeVersion3(profile.progress),
		companion: {
			name: companion.name,
			colorId: companion.colorId,
			wornItemIds: [...companion.wornItemIds]
		},
		lastGameByWorld: { ...profile.lastGameByWorld },
		ghosts: structuredClone(profile.ghosts)
	};
}
