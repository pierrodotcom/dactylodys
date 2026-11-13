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
	readonly elapsedMs: number;
	/** Character and Enter keystrokes; Backspace is not counted. */
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
