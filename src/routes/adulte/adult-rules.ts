import type { MasteryRules } from '$lib/engine/progression/mastery';

/**
 * When an acquired key counts as hesitant: right, but long to find. The child is compared with
 * the child's own keys, never with a speed to reach.
 */
export interface HesitationRules {
	/** Recent right keystrokes, at least, before the time of a key is measured. */
	readonly minCorrect: number;
	/** A key is hesitant once its time is at least this many times the median of the measured keys. */
	readonly factor: number;
	/** Measured keys, at least, before any key can be hesitant. */
	readonly minKeys: number;
}

/** Rules of the adult space: data, never constants in the code. */
export interface AdultRules {
	/** Digits of the optional code of the adult space. */
	readonly codeLength: number;
	/** When a key counts as acquired or fragile on the keyboard of the report. */
	readonly mastery: MasteryRules;
	/** When an acquired key is listed as long to find. */
	readonly hesitation: HesitationRules;
	/** Most recent plays drawn and listed in the evolution. */
	readonly sessionsShown: number;
	/** Most recent weeks drawn and listed for the days played; the count still starts at the first day. */
	readonly weeksShown: number;
	/** The speed at the keyboard is the median of the words per minute of these most recent plays. */
	readonly keyboardSpeedSessions: number;
	/** Words written in one minute that the adult may enter for a handwriting speed. */
	readonly handwritingMinWords: number;
	readonly handwritingMaxWords: number;
}

/*
 * The thresholds of an acquired key are those of the rewards that tame a key
 * (`chars-mastered` in the reward catalogues): the report and the rewards agree.
 */
export const ADULT_RULES: AdultRules = {
	codeLength: 4,
	mastery: {
		acquiredMinAttempts: 20,
		acquiredMaxErrorRate: 0.1,
		fragileMinAttempts: 5,
		fragileMinErrorRate: 0.2
	},
	hesitation: { minCorrect: 10, factor: 1.5, minKeys: 5 },
	sessionsShown: 30,
	weeksShown: 12,
	keyboardSpeedSessions: 5,
	handwritingMinWords: 1,
	handwritingMaxWords: 60
};
