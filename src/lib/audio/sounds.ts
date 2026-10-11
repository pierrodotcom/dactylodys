export const SOUND_IDS = ['correct', 'error', 'groupDone', 'lessonDone'] as const;
export type SoundId = (typeof SOUND_IDS)[number];

export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface SoundNote {
	/** Hertz. */
	readonly frequency: number;
	/** Seconds after the start of the sound. */
	readonly start: number;
	/** Seconds. */
	readonly duration: number;
}

export interface SoundDefinition {
	readonly waveform: Waveform;
	/** Peak gain of each note, from 0 to 1. */
	readonly volume: number;
	/** Seconds to reach the peak gain; must be shorter than any note. */
	readonly attack: number;
	/** Seconds to fade out at the end of each note. */
	readonly release: number;
	readonly notes: readonly SoundNote[];
}

/** Frequencies are musical notes (C5 = 523.25 Hz); nothing above C6 so that no sound is shrill. */
export const SOUNDS: Readonly<Record<SoundId, SoundDefinition>> = {
	correct: {
		waveform: 'sine',
		volume: 0.14,
		attack: 0.01,
		release: 0.06,
		notes: [{ frequency: 659.25, start: 0, duration: 0.09 }]
	},
	error: {
		waveform: 'sine',
		volume: 0.14,
		attack: 0.03,
		release: 0.12,
		notes: [{ frequency: 196, start: 0, duration: 0.2 }]
	},
	groupDone: {
		waveform: 'triangle',
		volume: 0.16,
		attack: 0.01,
		release: 0.08,
		notes: [
			{ frequency: 523.25, start: 0, duration: 0.14 },
			{ frequency: 783.99, start: 0.13, duration: 0.24 }
		]
	},
	lessonDone: {
		waveform: 'triangle',
		volume: 0.16,
		attack: 0.01,
		release: 0.1,
		notes: [
			{ frequency: 523.25, start: 0, duration: 0.14 },
			{ frequency: 659.25, start: 0.11, duration: 0.14 },
			{ frequency: 783.99, start: 0.22, duration: 0.14 },
			{ frequency: 1046.5, start: 0.33, duration: 0.45 }
		]
	}
};
