import type { SessionMetrics } from '../types';

/** Returns a number in [0, 1). Injected so that exercise generation is reproducible. */
export type Rng = () => number;

export type StarCount = 0 | 1 | 2 | 3;

/** Pedagogical thresholds: data, never constants in the code. */
export interface ProgressionRules {
	/** Minimum accuracy (0 to 100) that unlocks the next lesson. */
	readonly unlockAccuracy: number;
	/** Minimum accuracy for one, two and three stars, in ascending order. */
	readonly starThresholds: readonly [number, number, number];
	/** Share (0 to 1) of the characters of a generated group taken from the lesson's new characters. */
	readonly newCharWeight: number;
}

export interface LessonDefinition {
	/** `<language>.lesson.<slug>`. */
	readonly id: string;
	readonly title: string;
	/** One short sentence said to the child before playing, e.g. where to put the fingers. */
	readonly intro: string;
	/** Graphemes introduced by this lesson; a space is `" "`. */
	readonly newChars: readonly string[];
	/** Real words or syllables typable with the characters learned so far; may be empty. */
	readonly words: readonly string[];
	/** Number of groups in one exercise. */
	readonly groupCount: number;
	/** Minimum and maximum number of graphemes in a generated group. */
	readonly groupLength: readonly [number, number];
}

export interface WorldDefinition {
	/** `<language>.world.<slug>`. */
	readonly id: string;
	readonly title: string;
	/** Visual theme of the world, a key of the design tokens. */
	readonly themeId: string;
	readonly lessons: readonly LessonDefinition[];
}

export interface ProgressionDefinition {
	readonly schemaVersion: 1;
	/** `<language>.progression.<slug>`. */
	readonly id: string;
	readonly locale: string;
	/** Layouts this key order was designed for. */
	readonly layoutIds: readonly string[];
	readonly rules: ProgressionRules;
	readonly worlds: readonly WorldDefinition[];
}

/** What a mini-game receives: short targets typed one after the other. */
export interface Exercise {
	readonly lessonId: string;
	readonly groups: readonly string[];
}

export interface LessonEvaluation {
	readonly stars: StarCount;
	readonly unlocksNext: boolean;
}

export interface LessonResult {
	readonly lessonId: string;
	readonly metrics: SessionMetrics;
	readonly evaluation: LessonEvaluation;
	readonly completedAt: number;
}

export interface LessonProgress {
	readonly bestAccuracy: number;
	readonly stars: StarCount;
	readonly attempts: number;
	readonly lastPlayedAt: number;
}

export interface CharProgress {
	readonly attempts: number;
	readonly errors: number;
}

/** Everything the game remembers about one child's learning. Plain JSON. */
export interface ProgressState {
	readonly lessons: Readonly<Record<string, LessonProgress>>;
	/** Keyed by expected grapheme, accumulated over all sessions. */
	readonly chars: Readonly<Record<string, CharProgress>>;
}
