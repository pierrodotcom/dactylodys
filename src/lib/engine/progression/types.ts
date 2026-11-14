import type { SessionMetrics, SessionStart } from '../types';

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
	 * Times each new character of a lesson is asked at least in one exercise, by the warm-up that
	 * opens it (words that hold it, else suites); 0 disables it. A warm-up written by hand follows
	 * `writtenWarmUpMinCount` when the rules have one.
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
	/**
	 * When the warm-up of a new character is made of words that hold it instead of suites. Absent:
	 * always suites.
	 */
	readonly wordWarmUp?: WordWarmUpRules;
	/**
	 * Times a warm-up written by hand (`LessonDefinition.warmUp`) asks each new character at least,
	 * 1 or more: a mark shown in its place (`oui, non.`) takes more room than in a suite, so fewer
	 * of them keep the exercise short. Absent: `newCharMinCount`.
	 */
	readonly writtenWarmUpMinCount?: number;
	/**
	 * How a suite is built when one is needed: regular shapes that can be said aloud, instead of
	 * characters drawn at random. Absent: drawn at random.
	 */
	readonly drillPatterns?: DrillPatternRules;
	/**
	 * Words a lesson can use (its own and those of the bank) from which its mixed groups are never
	 * suites, whatever `mix.drills`: a suite only stays where no word can do. Absent: `mix` decides.
	 */
	readonly suiteFreeMinWords?: number;
	/**
	 * Capitals an exercise of a lesson that unlocks them holds at least: words are then drawn with
	 * a capital first letter. Absent or 0: no minimum.
	 */
	readonly uppercaseMinCount?: number;
	/**
	 * Review of the characters the child gets wrong lately, by words that hold them. Absent: only
	 * `weakCharBoost` brings them back.
	 */
	readonly weakChars?: WeakCharRules;
	/**
	 * Mark that ends a sentence: once it and the capitals are learned, a phrase of the bank written
	 * without them gets its capital first letter (when the capital is learned) and this mark at its
	 * end. Absent: phrases are typed as written.
	 */
	readonly phraseEnd?: string;
}

/** A warm-up made of words: data, never constants in the code. */
export interface WordWarmUpRules {
	/** Words that hold a new character, at least, for its warm-up to be made of them. */
	readonly minWords: number;
	/** Most graphemes of a word taken for a warm-up or for the review of a weak character. */
	readonly maxWordLength: number;
}

/**
 * Shapes of a suite. In a shape, `C` and `D` stand for two different consonants, `V` and `W` for
 * two different vowels, a space for itself; the new characters of the lesson take the places of
 * their kind first, known characters the others. A group never mixes more than two new characters
 * with more than two known ones.
 */
export interface DrillPatternRules {
	/** The vowels of the language, accented ones included; every other letter is a consonant. */
	readonly vowels: readonly string[];
	/** A shape with a vowel is preferred as soon as one is known: it can be said aloud. */
	readonly shapes: readonly string[];
}

/** Which characters are reviewed in every exercise, and how much: data, never constants. */
export interface WeakCharRules {
	/** Keystrokes of each weak character an exercise holds at least. */
	readonly minCount: number;
	/** Weak characters reviewed in one exercise at most: those with the highest recent error rate. */
	readonly maxChars: number;
	/** Recent keystrokes of a character, at least, before it can count as weak. */
	readonly minAttempts: number;
	/** Recent error rate (0 to 1) above which a character is weak. */
	readonly minErrorRate: number;
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
	/**
	 * Warm-up written by hand, typed as it is, in this order, at the start of every exercise
	 * instead of a generated one: for keys whose clearest practice is a series (`1 2 3`) or a mark
	 * in its place (`oui, non.`), and for the capitals a lesson unlocks. It asks each new character
	 * at least `rules.writtenWarmUpMinCount` times, else `rules.newCharMinCount` (checked), and no
	 * warm-up is generated after it. Absent: generated.
	 */
	readonly warmUp?: readonly string[];
	/**
	 * A lesson of repairs (ADR-057, proposal 10): its groups arrive begun, with one or more wrong
	 * characters after the right ones, to erase with Backspace. Absent: every group starts empty.
	 */
	readonly repair?: RepairRules;
}

/** How a lesson of repairs plants its mistakes: data, never constants in the code. */
export interface RepairRules {
	/**
	 * Share (0 to 1) of the groups of the text that ends the exercise which arrive with mistakes to
	 * erase (the first one among them when the text opens the exercise); every group before the
	 * text does, and so does every group of an exercise without text.
	 */
	readonly share: number;
	/** Most wrong characters written in one group, at least 1. */
	readonly maxPending: number;
}

/**
 * Characters of the keys next to the key of each character, at the same level, as the layout and
 * the shape of the keyboard place them: the likely slips of a finger.
 */
export type KeyNeighbors = ReadonlyMap<string, readonly string[]>;

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

/**
 * Age group of the child (ADR-057, proposal 15): it only changes which words, phrases and texts are offered,
 * never the keys, the thresholds or the games.
 */
export type AgeBand = '8-9' | '10-12';

/** `agent`: screened automatically and by an AI reviewer; `human`: validated by a person. */
export type ReviewStatus = 'agent' | 'human';

export interface WordEntry {
	/** Lowercase NFC. */
	readonly text: string;
	readonly themes: readonly string[];
	/** 1: very common and short, for the youngest; 3: for the oldest. */
	readonly level: WordLevel;
	readonly review: ReviewStatus;
	/** Age groups the word is offered to; absent: every one. */
	readonly ages?: readonly AgeBand[];
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
	/** Age groups the phrase is offered to; absent: every one. */
	readonly ages?: readonly AgeBand[];
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
	/** Age groups the text is offered to; absent: every one. */
	readonly ages?: readonly AgeBand[];
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
	/** Most graphemes of a word of the bank; absent: no limit. */
	readonly maxWordLength?: number;
	/** Theme of the current world. */
	readonly themeId?: string;
	/** Age group of the child: only the entries of the banks meant for it are used; absent: all. */
	readonly ageBand?: AgeBand;
	/**
	 * Neighbouring keys of the layout of the child (`keyNeighbors`): a lesson of repairs takes its
	 * mistakes among them. Absent: among the characters learned.
	 */
	readonly neighbors?: KeyNeighbors;
}

/** What a mini-game receives: short targets typed one after the other. */
export interface Exercise {
	readonly lessonId: string;
	readonly groups: readonly string[];
	/**
	 * How each group starts, in the order of `groups` (a lesson of repairs only): `null` for a group
	 * that starts empty, else where it arrives begun with mistakes to erase. Absent: all start empty.
	 */
	readonly starts?: readonly (SessionStart | null)[];
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
