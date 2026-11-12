export const AMBIENCE_IDS = ['soft-noise'] as const;
/** A background sound the child may choose; `'none'` (no sound) is the setting, not a sound. */
export type AmbienceId = (typeof AMBIENCE_IDS)[number];

export interface AmbienceDefinition {
	/**
	 * Brown noise (each sample a small random step from the one before) has most of its energy
	 * in the low frequencies: a soft breath, never a hiss.
	 */
	readonly noise: 'brown';
	/** Gain of the sound once faded in, from 0 to 1: far below the sounds of the game. */
	readonly volume: number;
	/** Share of `volume` kept while the voice speaks, from 0 to 1: the voice is always on top. */
	readonly duckedShare: number;
	/** Seconds to rise from silence. */
	readonly fadeInSeconds: number;
	/** Seconds to fall to silence, at a pause or when the page is hidden. */
	readonly fadeOutSeconds: number;
	/** Seconds to go down, and back up, around the voice. */
	readonly duckSeconds: number;
	/** Hertz: what is above is filtered out. */
	readonly lowpassHz: number;
	/** Seconds of noise generated once, then looped. */
	readonly loopSeconds: number;
	/** How far each sample of the brown noise moves from the one before, from 0 to 1. */
	readonly step: number;
}

export const AMBIENCES: Readonly<Record<AmbienceId, AmbienceDefinition>> = {
	'soft-noise': {
		noise: 'brown',
		volume: 0.05,
		duckedShare: 0.25,
		fadeInSeconds: 4,
		fadeOutSeconds: 2,
		duckSeconds: 0.4,
		lowpassHz: 600,
		loopSeconds: 6,
		step: 0.02
	}
};
