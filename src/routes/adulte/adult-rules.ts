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

/**
 * When a key typed right counts as acquired for the adult (P-17): typed right on several days, not
 * in one evening. Read on the days the profile keeps (`Profile.charDays`), which cover more.
 */
export interface AcquiredRules {
	/** Keystrokes, at least, over the days kept. */
	readonly minAttempts: number;
	/** Different days, at least; the days of a profile older than version 18 count as one. */
	readonly minDays: number;
	/** Share of wrong keystrokes over the days kept, at most. */
	readonly maxErrorRate: number;
}

/** Rules of the adult space: data, never constants in the code. */
export interface AdultRules {
	/** Digits of the optional code of the adult space. */
	readonly codeLength: number;
	/**
	 * When a key counts as typed right (`acquired` here), or fragile, on its recent results: the
	 * threshold the game reads to fade a key (ADR-061), never shown as « acquired » to the adult.
	 */
	readonly mastery: MasteryRules;
	/** When a key typed right counts as acquired. */
	readonly acquired: AcquiredRules;
	/** When an acquired key is listed as long to find. */
	readonly hesitation: HesitationRules;
	/** Most recent plays drawn and listed in the evolution. */
	readonly sessionsShown: number;
	/** Most recent weeks drawn and listed for the days played; the count still starts at the first day. */
	readonly weeksShown: number;
	/** The speed at the keyboard is the median of the words per minute of these most recent plays. */
	readonly keyboardSpeedSessions: number;
	/**
	 * Plays measured with the current rule (`SessionRecord.speedRule`), at least, for the speed at
	 * the keyboard to read only those: below, it reads the most recent plays whatever their rule.
	 */
	readonly keyboardSpeedMinCurrentRule: number;
	/** Words written in one minute that the adult may enter for a handwriting speed. */
	readonly handwritingMinWords: number;
	readonly handwritingMaxWords: number;
	/**
	 * Largest file read as a backup, in bytes: a bigger one is refused before it is read, so that a
	 * file chosen by mistake (a film) never freezes the page. Far above a real backup, which stays
	 * under a megabyte for a child who has played two thousand times.
	 */
	readonly maxBackupFileBytes: number;
}

/*
 * The thresholds of a key typed right are those of the rewards that tame a key
 * (`chars-mastered` in the reward catalogues): the report and the rewards agree. An acquired key
 * asks for more (P-17): the days kept cover it (`CHAR_DAYS_RULES`, tested).
 */
export const ADULT_RULES: AdultRules = {
	codeLength: 4,
	mastery: {
		acquiredMinAttempts: 20,
		acquiredMaxErrorRate: 0.1,
		fragileMinAttempts: 5,
		fragileMinErrorRate: 0.2
	},
	acquired: { minAttempts: 40, minDays: 3, maxErrorRate: 0.1 },
	hesitation: { minCorrect: 10, factor: 1.5, minKeys: 5 },
	sessionsShown: 30,
	weeksShown: 12,
	keyboardSpeedSessions: 5,
	keyboardSpeedMinCurrentRule: 3,
	handwritingMinWords: 1,
	handwritingMaxWords: 60,
	maxBackupFileBytes: 50_000_000
};
