import type { Settings } from './types';

/** What "Calm everything" may change, in the order it is told. */
export type CalmChange = 'motion' | 'effects' | 'sound';

export interface CalmDown {
	/** What to change in the settings; empty when everything is already calm. */
	readonly patch: Partial<Settings>;
	/** What was not calm yet, in the order of `CALM_CHANGES`. */
	readonly changes: readonly CalmChange[];
}

export const CALM_CHANGES = ['motion', 'effects', 'sound'] as const satisfies readonly CalmChange[];

/**
 * "Calm everything", in one press: reduced motion, no light effects, no sounds of the game. The
 * voice of the instructions and the background sound are left as they are: they calm, they
 * do not agitate. Nothing else changes, and each setting can be changed back one by one.
 */
export function calmDown(settings: Settings): CalmDown {
	const patch: { -readonly [K in keyof Settings]?: Settings[K] } = {};
	const changes: CalmChange[] = [];
	if (settings.motion !== 'reduced') {
		patch.motion = 'reduced';
		changes.push('motion');
	}
	if (settings.effects) {
		patch.effects = false;
		changes.push('effects');
	}
	if (settings.soundEnabled) {
		patch.soundEnabled = false;
		changes.push('sound');
	}
	return { patch, changes };
}
