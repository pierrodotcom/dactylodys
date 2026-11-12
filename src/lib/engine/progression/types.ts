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
	/** How much more often a character the child gets wrong is practised; 0 disables it. */
	readonly weakCharBoost: number;
	/** How much more often a word of the current world's theme is picked; 0 disables it. */
	readonly themeBoost: number;
	/**
	 * Times each new character of a lesson is asked at least in one exercise, by warm-up suites that
	 * open it; 0 disables it.
	 */
	readonly newCharMinCount: number;
	/**
	 * Keystrokes of a character that its recent results cover, at least 1: plays older than those
	 * that reach this number no longer count.
	 */
	readonly recentCharWindow: number;
	/**
	 * Characters by which an exercise may run past its lesson's `targetLength` : a word or phrase
	 * that would go beyond it is replaced by a suite. Absent: no limit.
	 */
	readonly lengthSlack?: number;
	/** When the hand drawn on the keyboard shows the fingers; absent: never on its own. */
	readonly handGuide?: HandGuideRules;
	/**
	 * Points of accuracy below the next star within which the result says the child is nearly there
	 * and draws that star half full; absent: never.
	 */
	readonly starAlmostMargin?: number;
	/**
	 * Plays of a lesson between two exercises that end with one of its story phrases
	 * (`PhraseEntry.lessonId`), at least 1: the exercise has one when the plays already made are a
	 * multiple of it, so the first exercise always does. Absent: story phrases are never asked.
	 */
	readonly storyPhraseEvery?: number;
	/**
	 * When a key of the keyboard drawn in the games loses its letter: once every character the
	 * progression has brought on it so far is acquired (`charMastery`). Absent: no key fades.
	 */
	readonly keyboardFade?: MasteryRules;
	/**
	 * Most graphemes in one group of a text (`TextEntry`), its line breaks counted: the lines of a
	 * text are put together in a group as long as they fit, a longer line is a group on its own.
	 * Absent: one line per group.
	 */
	readonly textGroupLength?: number;
}

/** Thresholds of `charMastery`: data, never constants in the code. */
export interface MasteryRules {
	/** Recent keystrokes of the character, at least, before it can count as acquired. */
	readonly acquiredMinAttempts: number;
	/** Highest recent error rate (0 to 1) of an acquired character. */
	readonly acquiredMaxErrorRate: number;
	/** Recent keystrokes of the character, at least, before it can count as fragile. */
	readonly fragileMinAttempts: number;
	/** Recent error rate (0 to 1) above which a character is fragile. */
	readonly fragileMinErrorRate: number;
}

/**
 * Lessons are counted from 1 in the order of the progression. Up to `everyKeyUntil` the hand
 * shows every key; then, up to `newKeysUntil`, only the new keys of the lesson and the key after
 * a mistake; after that, nothing.
 */
export interface HandGuideRules {
	readonly everyKeyUntil: number;
	readonly newKeysUntil: number;
	/**
	 * In the new-keys mode, milliseconds without a key after which the hand shows the expected one
	 * anyway: a child who hesitates is helped. Absent or 0: never.
	 */
	readonly hesitationMs?: number;
}

/** The choice of the child or the adult: follow the lessons, always show, never show. */
export type HandGuidePreference = 'auto' | 'always' | 'off';

/** What the hand shows during one exercise. */
export type GuideMode = 'every-key' | 'new-keys' | 'none';

/** Relative weights of the three kinds of groups in an exercise; at least one is positive. */
export interface ExerciseMix {
	readonly drills: number;
	readonly words: number;
	readonly phrases: number;
}

/** `uppercase`: from this lesson on, the capital of every learned unaccented letter is known. */
export type LessonUnlock = 'uppercase';

export interface LessonDefinition {
	/** `<language>.lesson.<slug>`. */
	readonly id: string;
	readonly title: string;
	/** One short sentence said to the child before playing, e.g. where to put the fingers. */
	readonly intro: string;
	/** Graphemes introduced by this lesson; a space is `" "`. */
	readonly newChars: readonly string[];
	/** Hand-picked words typable with the characters learned so far; may be empty. */
	readonly words: readonly string[];
	readonly mix: ExerciseMix;
	readonly unlocks: readonly LessonUnlock[];
	/** Maximum number of groups in one exercise. */
	readonly groupCount: number;
	/** Approximate number of graphemes in one exercise; generation stops once it is reached. */
	readonly targetLength: number;
	/** Minimum and maximum number of graphemes in a generated group. */
	readonly groupLength: readonly [number, number];
}

export interface WorldDefinition {
	/** `<language>.world.<slug>`. */
	readonly id: string;
	readonly title: string;
	/** Theme of the world: visual identity and preferred vocabulary. */
	readonly themeId: string;
	/** Mini-games offered in this world; the first one is the default. */
	readonly gameIds: readonly string[];
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

export type WordLevel = 1 | 2 | 3;

/** `agent`: screened automatically and by an AI reviewer; `human`: validated by a person. */
export type ReviewStatus = 'agent' | 'human';

export interface WordEntry {
	/** Lowercase NFC. */
	readonly text: string;
	readonly themes: readonly string[];
	/** 1: very common and short, for the youngest; 3: for the oldest. */
	readonly level: WordLevel;
	readonly review: ReviewStatus;
}

export interface BankSource {
	readonly name: string;
	readonly url: string;
	readonly license: string;
}

export interface ThemeDefinition {
	readonly id: string;
	readonly title: string;
}

export interface WordBank {
	readonly schemaVersion: 1;
	/** `<language>.words.<slug>`. */
	readonly id: string;
	readonly locale: string;
	readonly sources: readonly BankSource[];
	readonly themes: readonly ThemeDefinition[];
	readonly words: readonly WordEntry[];
}

export interface PhraseEntry {
	/** A short sentence, NFC, with its capital letters and punctuation. */
	readonly text: string;
	readonly themes: readonly string[];
	readonly level: WordLevel;
	readonly review: ReviewStatus;
	/**
	 * A phrase that tells the story of this lesson's world: it is asked in this lesson only, as the
	 * last group of an exercise (`ProgressionRules.storyPhraseEvery`), and never mixed elsewhere.
	 */
	readonly lessonId?: string;
}

export interface PhraseBank {
	readonly schemaVersion: 1;
	/** `<language>.phrases.<slug>`. */
	readonly id: string;
	readonly locale: string;
	readonly phrases: readonly PhraseEntry[];
}

/**
 * A short text of everyday life, typed line after line with Enter between two lines (a message, a
 * list, a recipe): it ends every exercise of its lesson, whole.
 */
export interface TextEntry {
	/** `<language>.text.<slug>`. */
	readonly id: string;
	/** The lesson whose exercises end with this text. */
	readonly lessonId: string;
	/** At least two lines, NFC, each without a line break; Enter is typed between two of them. */
	readonly lines: readonly string[];
	readonly level: WordLevel;
	readonly review: ReviewStatus;
}

export interface TextBank {
	readonly schemaVersion: 1;
	/** `<language>.texts.<slug>`. */
	readonly id: string;
	readonly locale: string;
	readonly texts: readonly TextEntry[];
}

/** Everything optional that shapes an exercise for one child at one moment. */
export interface ExerciseContext {
	readonly words?: WordBank;
	readonly phrases?: PhraseBank;
	/** Texts of the lessons that have some: such a lesson ends each exercise with one of them. */
	readonly texts?: TextBank;
	/** Enables practising weak characters more often. */
	readonly progress?: ProgressState;
	/** Highest word and phrase level allowed; defaults to 3. */
	readonly maxLevel?: WordLevel;
	/** Theme of the current world. */
	readonly themeId?: string;
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

/** One play in which a character was asked: integers, `attempts >= 1`, `0 <= errors <= attempts`. */
export interface CharSample {
	readonly attempts: number;
	readonly errors: number;
	/**
	 * Mean milliseconds before the right keystrokes of the character in this play
	 * (`CharStats.meanLatencyMs`); `null` without any right keystroke, or for a sample of a profile
	 * older than version 8. Shown to the adult only, never a goal for the child.
	 */
	readonly latencyMs: number | null;
}

export interface CharProgress {
	/** Lifetime totals: a key that was hard for long keeps them, so nothing is decided on them. */
	readonly attempts: number;
	readonly errors: number;
	/**
	 * The most recent plays, oldest first, one sample per play in which the character was asked;
	 * older ones are dropped once these cover `ProgressionRules.recentCharWindow` keystrokes.
	 */
	readonly recent: readonly CharSample[];
}

/** Everything the game remembers about one child's learning. Plain JSON. */
export interface ProgressState {
	readonly lessons: Readonly<Record<string, LessonProgress>>;
	/** Keyed by expected grapheme. */
	readonly chars: Readonly<Record<string, CharProgress>>;
}
