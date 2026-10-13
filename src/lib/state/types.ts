import type { GhostRun } from '../engine/ghost/types';
import type { ProgressState } from '../engine/progression/types';
import type { CompanionChoice } from '../engine/rewards/types';
import type { FingeringProfileId, LayoutId } from '../keyboard/layout-ids';

export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduced' | 'full';
export type TextScale = 'md' | 'lg' | 'xl';
export type TextSpacing = 'normal' | 'wide' | 'wider';

export interface Settings {
	readonly layoutId: LayoutId;
	readonly fingeringProfileId: FingeringProfileId;
	readonly soundEnabled: boolean;
	/** Spoken instructions, apart from the sounds of the game. */
	readonly voiceEnabled: boolean;
	readonly theme: ThemePreference;
	readonly motion: MotionPreference;
	readonly textScale: TextScale;
	/** Letter and word spacing of the text to type. */
	readonly textSpacing: TextSpacing;
	/** Show the on-screen keyboard and the expected finger. */
	readonly showKeyboard: boolean;
}

export type { CompanionChoice };

/** One child on this device. Plain JSON, never leaves the device. */
export interface Profile {
	readonly schemaVersion: 2;
	readonly id: string;
	/** Nickname chosen by the child; shown only on this device. */
	readonly name: string;
	readonly createdAt: number;
	/** `true` once the keyboard check of the first launch has been done. */
	readonly calibrated: boolean;
	readonly settings: Settings;
	readonly progress: ProgressState;
	/** Only the choices of the child: what is unlocked is computed from the progress, never stored. */
	readonly companion: CompanionChoice;
	/** Mini-game chosen last in each world, by world identifier. */
	readonly lastGameByWorld: Readonly<Record<string, string>>;
	/** Pace of the last passed play of each lesson, by lesson identifier. */
	readonly ghosts: Readonly<Record<string, GhostRun>>;
}

/**
 * A stored record the app cannot open. `newer-version`: written by a more recent version of the
 * app; `invalid`: damaged, or of no known format. `id` and `name` are read as well as possible
 * and are not validated.
 */
export interface UnreadableProfile {
	readonly id: string | null;
	readonly name: string | null;
	readonly reason: 'newer-version' | 'invalid';
}

/** Persistence boundary: local today, optionally synchronised later (ADR-001). */
export interface ProfileStore {
	/** The profiles the app can open, brought to the current version in memory only. */
	list(): Promise<readonly Profile[]>;
	get(id: string): Promise<Profile | null>;
	/** Rejects rather than replace a record the app cannot open. */
	save(profile: Profile): Promise<void>;
	/** Rejects rather than delete a record the app cannot open. */
	remove(id: string): Promise<void>;
	/** The records left out of `list`; the store never deletes nor replaces them. */
	listUnreadable(): Promise<readonly UnreadableProfile[]>;
}
