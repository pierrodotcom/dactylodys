import type { KeyCode, KeystrokeKind } from '../keyboard/types';

/**
 * `retry`: a wrong key does not move the cursor; the right key must be typed.
 * `backspace`: a wrong character is inserted and must be erased before going on.
 */
export type ErrorPolicy = 'retry' | 'backspace';

export interface SessionOptions {
	readonly errorPolicy: ErrorPolicy;
}

/**
 * A group that arrives already begun, like a message to repair (ADR-057, proposal 10): its first
 * `typed` graphemes are written right, followed by the wrong characters of `pending`, to erase with
 * Backspace before going on. The child did not type them: they count neither as mistakes nor as
 * keystrokes. Such a session always uses the `backspace` policy.
 */
export interface SessionStart {
	/** Graphemes of the target already written right, from 0 to the length of the target minus 1. */
	readonly typed: number;
	/** Wrong characters written after them, at least one, the first one not the expected grapheme. */
	readonly pending: readonly string[];
}

/** What `createSession` accepts: the options, and where a group that arrives begun starts. */
export interface SessionSetup extends Partial<SessionOptions> {
	readonly start?: SessionStart;
	/**
	 * Moment the group can be typed (on screen and ready), on the clock of the keystrokes: its time
	 * is counted from then. Absent: counted from its first keystroke, as it was before.
	 */
	readonly shownAt?: number;
}

/** A pause that is over, on the clock of the keystrokes: its time is not time spent typing. */
export interface SessionPause {
	readonly from: number;
	readonly to: number;
}

/** How the time of a group is measured: data, never a constant in the logic. */
export interface MeasureRules {
	/**
	 * Longest wait before the first keystroke of a group that counts as time spent on it, in
	 * milliseconds: reading and finding the first key count, looking away does not.
	 */
	readonly firstKeyWaitCapMs: number;
}

export interface KeystrokeRecord {
	/** Index in `SessionState.target` of the grapheme that was expected. */
	readonly targetIndex: number;
	readonly expected: string;
	/** Typed character, `\n` for Enter, `null` for Backspace. */
	readonly typed: string | null;
	readonly kind: KeystrokeKind;
	readonly correct: boolean;
	readonly code: KeyCode | null;
	readonly timestamp: number;
	/**
	 * Typed over a mistake that is not erased yet (`backspace` policy): written and to erase, but
	 * counted neither right nor wrong, like Backspace. One mistake, one error.
	 */
	readonly overMistake?: true;
}

/** Immutable; every keystroke yields a new state. */
export interface SessionState {
	/** Text to type, split into NFC graphemes; a line break is `\n`. */
	readonly target: readonly string[];
	/** Index of the next grapheme to type; equals `target.length` when complete. */
	readonly position: number;
	/** Wrong characters waiting to be erased (`backspace` policy only). */
	readonly pending: readonly string[];
	/** Timestamp of the first keystroke, `null` before it. */
	readonly startedAt: number | null;
	readonly endedAt: number | null;
	readonly records: readonly KeystrokeRecord[];
	readonly options: SessionOptions;
	/** See `SessionSetup.shownAt`; absent when it was not given. */
	readonly shownAt?: number;
	/** The pauses that are over, in order; absent before the first one. */
	readonly pauses?: readonly SessionPause[];
	/** Start of the pause in progress; absent when the group is not paused. */
	readonly pausedAt?: number;
}

export type SessionEvent =
	| { readonly type: 'correct'; readonly index: number; readonly char: string }
	| {
			readonly type: 'error';
			readonly index: number;
			readonly expected: string;
			readonly typed: string;
	  }
	| { readonly type: 'erased'; readonly index: number }
	| { readonly type: 'completed'; readonly endedAt: number };

export interface SessionStep {
	readonly state: SessionState;
	readonly events: readonly SessionEvent[];
}

export interface CharStats {
	readonly attempts: number;
	readonly errors: number;
	/** Mean delay before a correct keystroke on this character, `null` without data. */
	readonly meanLatencyMs: number | null;
}

export interface SessionMetrics {
	/**
	 * Time spent on the text, pauses left out. With `speedRule` 2, from the moment each group could
	 * be typed (the wait before its first keystroke capped by `MeasureRules`); else from its first
	 * keystroke.
	 */
	readonly elapsedMs: number;
	/**
	 * 2 when the time of every group was counted from the moment it could be typed; absent when
	 * it was counted from its first keystroke, as before: the two speeds do not compare.
	 */
	readonly speedRule?: 2;
	/**
	 * Character and Enter keystrokes; Backspace is not counted, nor what is typed over a mistake
	 * that is not erased yet.
	 */
	readonly totalKeystrokes: number;
	readonly correctKeystrokes: number;
	readonly errorCount: number;
	/** 0 to 100. */
	readonly accuracy: number;
	readonly correctCharsPerMinute: number;
	/** `correctCharsPerMinute / 5`. */
	readonly wordsPerMinute: number;
	/** Keyed by expected grapheme. */
	readonly perChar: Readonly<Record<string, CharStats>>;
}
