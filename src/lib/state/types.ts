import type { ProgressState } from '../engine/progression/types';
import type { FingeringProfileId, LayoutId } from '../keyboard/layout-ids';

export type ThemePreference = 'system' | 'light' | 'dark';
export type MotionPreference = 'system' | 'reduced' | 'full';
export type TextScale = 'md' | 'lg' | 'xl';
export type TextSpacing = 'normal' | 'wide' | 'wider';

export interface Settings {
	readonly layoutId: LayoutId;
	readonly fingeringProfileId: FingeringProfileId;
	readonly soundEnabled: boolean;
	readonly theme: ThemePreference;
	readonly motion: MotionPreference;
	readonly textScale: TextScale;
	/** Letter and word spacing of the text to type. */
	readonly textSpacing: TextSpacing;
	/** Show the on-screen keyboard and the expected finger. */
	readonly showKeyboard: boolean;
}

/** One child on this device. Plain JSON, never leaves the device. */
export interface Profile {
	readonly schemaVersion: 1;
	readonly id: string;
	/** Nickname chosen by the child; shown only on this device. */
	readonly name: string;
	readonly createdAt: number;
	/** `true` once the keyboard check of the first launch has been done. */
	readonly calibrated: boolean;
	readonly settings: Settings;
	readonly progress: ProgressState;
}

/** Persistence boundary: local today, optionally synchronised later (ADR-001). */
export interface ProfileStore {
	list(): Promise<readonly Profile[]>;
	get(id: string): Promise<Profile | null>;
	save(profile: Profile): Promise<void>;
	remove(id: string): Promise<void>;
}
