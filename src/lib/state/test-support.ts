import type { ProgressState } from '../engine/progression/types';
import type { NoticeChannelFactory } from './profile-notices';
import type { Profile, SessionRecord } from './types';

/**
 * Pages of the same device for a test: what one posts on a channel of the hub reaches all the
 * others at once, never itself, as a `BroadcastChannel` does.
 */
export function createNoticeHub(): NoticeChannelFactory {
	const handlers = new Map<object, (message: unknown) => void>();
	return () => {
		const page = {};
		return {
			post: (message) => {
				for (const [other, handler] of handlers) if (other !== page) handler(message);
			},
			receive: (handler) => {
				handlers.set(page, handler);
			},
			close: () => {
				handlers.delete(page);
			}
		};
	};
}

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

/** The progress as versions 3 to 7 stored it: recent plays without the time before a right keystroke. */
function progressBeforeVersion8(progress: ProgressState): Record<string, unknown> {
	return {
		lessons: structuredClone(progress.lessons),
		chars: Object.fromEntries(
			Object.entries(progress.chars).map(([char, stats]) => [
				char,
				{
					attempts: stats.attempts,
					errors: stats.errors,
					recent: stats.recent.map(({ attempts, errors }) => ({ attempts, errors }))
				}
			])
		)
	};
}

/** What a profile becomes once its times are lost, as in a migration to version 8. */
export function withUnknownLatency(profile: Profile): Profile {
	const chars = Object.fromEntries(
		Object.entries(profile.progress.chars).map(([char, stats]) => [
			char,
			{ ...stats, recent: stats.recent.map((sample) => ({ ...sample, latencyMs: null })) }
		])
	);
	return { ...profile, progress: { ...profile.progress, chars } };
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

/** The record version 3 of the app stored for this profile, listed field by field as well. */
export function asVersion3(profile: Profile): Record<string, unknown> {
	const { settings, companion } = profile;
	return {
		schemaVersion: 3,
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
		progress: progressBeforeVersion8(profile.progress),
		companion: {
			name: companion.name,
			colorId: companion.colorId,
			wornItemIds: [...companion.wornItemIds]
		},
		lastGameByWorld: { ...profile.lastGameByWorld },
		ghosts: structuredClone(profile.ghosts)
	};
}

/** The record version 4 of the app stored for this profile: version 3 plus the hand guide. */
export function asVersion4(profile: Profile): Record<string, unknown> {
	const stored = asVersion3(profile);
	return {
		...stored,
		schemaVersion: 4,
		settings: {
			...(stored['settings'] as Record<string, unknown>),
			handGuide: profile.settings.handGuide
		}
	};
}

/** What version 7 added: a profile migrated from an older version has these empty. */
export const EMPTY_JOURNAL = {
	sessions: [],
	practiceDays: [],
	handwritingSamples: [],
	adultWords: [],
	openedWorldIds: []
} as const satisfies Partial<Profile>;

/**
 * What a profile becomes once migrated from version 14 or older, when it passed no lesson of the
 * order of version 14: no lesson is kept open.
 */
export function withNothingKeptOpen(profile: Profile): Profile {
	return withWorldPolicy({ ...profile, keptOpenLessonIds: [] });
}

/**
 * What a profile becomes once migrated from version 15 or older: a session of the usual length,
 * and the worlds deciding how a mistake is handled, unless the adult had chosen Backspace.
 */
export function withWorldPolicy(profile: Profile): Profile {
	const errorPolicy = profile.settings.errorPolicy === 'backspace' ? 'backspace' : 'world';
	return { ...profile, settings: { ...profile.settings, sessionLength: 'normal', errorPolicy } };
}

/**
 * The record version 15 of the app stored: the same profile without the length of a session, and
 * with the two choices the adult had then for the mistakes (the game waits, or Backspace).
 */
export function asVersion15(profile: Profile): Record<string, unknown> {
	const settings: Record<string, unknown> = {
		...profile.settings,
		errorPolicy: profile.settings.errorPolicy === 'backspace' ? 'backspace' : 'retry'
	};
	delete settings['sessionLength'];
	return { ...profile, schemaVersion: 15, settings };
}

/** The record version 14 of the app stored: version 15 without the lessons kept open. */
export function asVersion14(profile: Profile): Record<string, unknown> {
	const stored: Record<string, unknown> = { ...asVersion15(profile), schemaVersion: 14 };
	delete stored['keptOpenLessonIds'];
	return stored;
}

/** What a profile becomes once migrated from version 12 or older: an empty hideout. */
export function withEmptyHideout(profile: Profile): Profile {
	return withNothingKeptOpen({ ...profile, hideout: {} });
}

/** What a profile becomes once migrated from version 11 or older: the words of the 8-9 year olds. */
export function withYoungerAgeBand(profile: Profile): Profile {
	return withEmptyHideout({ ...profile, settings: { ...profile.settings, ageBand: '8-9' } });
}

/** What a profile becomes once migrated from version 10 or older: effects on, no background sound. */
export function withSensoryDefaults(profile: Profile): Profile {
	return withYoungerAgeBand({
		...profile,
		settings: { ...profile.settings, effects: true, ambience: 'none' }
	});
}

/** What a profile becomes once migrated from version 9 or older: the known keys fade. */
export function withKeyboardFade(profile: Profile): Profile {
	return withSensoryDefaults({ ...profile, settings: { ...profile.settings, keyboardFade: true } });
}

/** What a profile becomes once migrated from version 8 or older: Backspace off, as before. */
export function withRetryPolicy(profile: Profile): Profile {
	return withKeyboardFade({ ...profile, settings: { ...profile.settings, errorPolicy: 'retry' } });
}

/** What a profile becomes once migrated from version 13 or older: no play says how it was measured. */
export function withUnmarkedSessions(profile: Profile): Profile {
	const sessions = profile.sessions.map((session) => {
		const unmarked: Partial<Record<keyof SessionRecord, unknown>> = { ...session };
		delete unmarked.speedRule;
		return unmarked as SessionRecord;
	});
	return withNothingKeptOpen({ ...profile, sessions });
}

/** The record version 13 of the app stored: the same profile, no play saying how it was measured. */
export function asVersion13(profile: Profile): Record<string, unknown> {
	return { ...asVersion14(withUnmarkedSessions(profile)), schemaVersion: 13 };
}

/** The record version 12 of the app stored: the same profile without the hideout. */
export function asVersion12(profile: Profile): Record<string, unknown> {
	const stored: Record<string, unknown> = { ...asVersion14(profile), schemaVersion: 12 };
	delete stored['hideout'];
	return stored;
}

/** The record version 11 of the app stored: version 12 without the age group. */
export function asVersion11(profile: Profile): Record<string, unknown> {
	const version12 = asVersion12(profile);
	const settings: Record<string, unknown> = {
		...(version12['settings'] as Record<string, unknown>)
	};
	delete settings['ageBand'];
	return { ...version12, schemaVersion: 11, settings };
}

/** The record version 10 of the app stored: version 11 without the effects nor the background sound. */
export function asVersion10(profile: Profile): Record<string, unknown> {
	const version11 = asVersion11(profile);
	const settings: Record<string, unknown> = {
		...(version11['settings'] as Record<string, unknown>)
	};
	delete settings['effects'];
	delete settings['ambience'];
	return { ...version11, schemaVersion: 10, settings };
}

/** The record version 9 of the app stored: version 10 without the choice of the fading keys. */
export function asVersion9(profile: Profile): Record<string, unknown> {
	const version10 = asVersion10(profile);
	const settings: Record<string, unknown> = {
		...(version10['settings'] as Record<string, unknown>)
	};
	delete settings['keyboardFade'];
	return { ...version10, schemaVersion: 9, settings };
}

/** The record version 8 of the app stored: version 9 without the choice of Backspace. */
export function asVersion8(profile: Profile): Record<string, unknown> {
	const version9 = asVersion9(profile);
	const settings: Record<string, unknown> = {
		...(version9['settings'] as Record<string, unknown>)
	};
	delete settings['errorPolicy'];
	return { ...version9, schemaVersion: 8, settings };
}

/** The record version 7 of the app stored: version 8 without the times of the recent plays. */
export function asVersion7(profile: Profile): Record<string, unknown> {
	return {
		...asVersion8(profile),
		schemaVersion: 7,
		progress: progressBeforeVersion8(profile.progress)
	};
}

/** The record version 6 of the app stored: version 7 without the journal. */
export function asVersion6(profile: Profile): Record<string, unknown> {
	const stored: Record<string, unknown> = { ...asVersion7(profile), schemaVersion: 6 };
	for (const key of Object.keys(EMPTY_JOURNAL)) delete stored[key];
	return stored;
}

/** The record version 5 of the app stored: version 6 without the plays of each game. */
export function asVersion5(profile: Profile): Record<string, unknown> {
	const stored: Record<string, unknown> = { ...asVersion6(profile), schemaVersion: 5 };
	delete stored['gamePlays'];
	return stored;
}
