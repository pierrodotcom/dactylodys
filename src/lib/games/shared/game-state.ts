import type { SoundId } from '../../audio/sounds';
import { pacePoints } from '../../engine/ghost/ghost';
import { combineMetrics, computeMetrics, sessionTypingMs } from '../../engine/metrics';
import { applyKeystroke, createSession, pauseSession, resumeSession } from '../../engine/session';
import type { ErrorPolicy, SessionMetrics, SessionStart, SessionState } from '../../engine/types';
import { keyCodeForChar } from '../../keyboard/layout';
import type { CharIndex, KeyCode, NormalizedKeystroke } from '../../keyboard/types';
import type { GameOutcome } from '../types';

const LINE_BREAK = '\n';

export type GameMood = 'idle' | 'happy' | 'oops' | 'cheer';

/**
 * `typing`: the group is being typed.
 * `celebrating`: the group is done and the game shows its reward before the next group.
 * `finale`: the last reward is over and the game shows its final picture, until the child goes on.
 * `complete`: nothing is left; the game reports its outcome.
 */
export type GamePhase = 'typing' | 'celebrating' | 'finale' | 'complete';

export interface GameState {
	readonly groups: readonly string[];
	/**
	 * How each group starts (`Exercise.starts`): a group with a start arrives begun, with mistakes to
	 * erase whatever the error policy; the others follow `errorPolicy`. Empty: all start empty.
	 */
	readonly starts: readonly (SessionStart | null)[];
	readonly errorPolicy: ErrorPolicy;
	/** Whether the game keeps a final picture after the last reward. */
	readonly hasFinale: boolean;
	readonly groupIndex: number;
	readonly session: SessionState;
	/** Metrics of the groups already typed, in order. */
	readonly finished: readonly SessionMetrics[];
	/**
	 * Time each group already typed took from its first to its last keystroke, pauses left out,
	 * in order: the pace kept for the ghost, on the clock the race is run with (`followGame`).
	 */
	readonly typedMs: readonly number[];
	readonly phase: GamePhase;
	/**
	 * The reward has been on screen long enough to be seen: from then on a key moves the game
	 * to the next group. Before that the keys of a child still typing out of habit change nothing.
	 */
	readonly settled: boolean;
	readonly paused: boolean;
	/**
	 * Index in the current group of the character that was mistyped, `null` when there is none. With
	 * the `backspace` policy it stays set once the wrong characters are erased, until the right key.
	 */
	readonly errorIndex: number | null;
	/**
	 * What the keys of the layout write, to find the key of a mistake; `null` when the game was
	 * given none: no key is shown then.
	 */
	readonly charIndex: CharIndex | null;
	/**
	 * Key of the last mistake, shown on the keyboard until the next good key: the one that writes
	 * the wrong character on the layout, `null` when none does. Never the physical key the browser
	 * reports (`NormalizedKeystroke.code`): it is not the real one in a browser that resists
	 * fingerprinting.
	 */
	readonly wrongCode: KeyCode | null;
	readonly mood: GameMood;
	/**
	 * The characters the child was asked when a mistake was made, each once, in order, since the
	 * start of the game: their keys are written again on the keyboard until the end (ADR-057).
	 */
	readonly missedChars: readonly string[];
}

/*
 * `at` is the moment of the action on the clock of the keystrokes. A game gives it each time: the
 * time of a group is counted from the moment it can be typed, pauses left out. Without it, the
 * group is measured from its first keystroke and a pause counts as typing, as it was before.
 */
export type GameAction =
	| { readonly type: 'keystroke'; readonly keystroke: NormalizedKeystroke }
	/** The time given to the reward is over: the next group can be typed from `at`. */
	| { readonly type: 'advance'; readonly at?: number }
	/** The reward has had the time to be seen. */
	| { readonly type: 'settle' }
	/** The moment after a mistake is over. */
	| { readonly type: 'calm' }
	| { readonly type: 'pause'; readonly at?: number }
	| { readonly type: 'resume'; readonly at?: number }
	/** The child is done with the final picture. */
	| { readonly type: 'finish' };

export interface GameStep {
	readonly state: GameState;
	/** Sounds to play, in order. */
	readonly sounds: readonly SoundId[];
}

export interface GameOptions {
	readonly finale?: boolean;
	/** How each group starts, in the order of the groups (`Exercise.starts`). */
	readonly starts?: readonly (SessionStart | null)[];
	/** Moment the first group can be typed, on the clock of the keystrokes (see `GameAction`). */
	readonly at?: number;
	/** What the keys of the layout write: the key of a mistake is found in it (`wrongCode`). */
	readonly charIndex?: CharIndex;
}

function sessionOf(
	groups: readonly string[],
	starts: readonly (SessionStart | null)[],
	index: number,
	errorPolicy: ErrorPolicy,
	shownAt: number | undefined
): SessionState {
	const start = starts[index] ?? undefined;
	return createSession(groups[index] as string, { errorPolicy, start, shownAt });
}

export function createGame(
	groups: readonly string[],
	errorPolicy: ErrorPolicy,
	options: GameOptions = {}
): GameState {
	if (groups.length === 0) throw new RangeError('An exercise needs at least one group');
	const starts = options.starts ?? [];
	return {
		groups,
		starts,
		errorPolicy,
		hasFinale: options.finale ?? false,
		groupIndex: 0,
		session: sessionOf(groups, starts, 0, errorPolicy, options.at),
		finished: [],
		typedMs: [],
		phase: 'typing',
		settled: false,
		paused: false,
		errorIndex: null,
		charIndex: options.charIndex ?? null,
		wrongCode: null,
		mood: 'idle',
		missedChars: []
	};
}

function unchanged(state: GameState): GameStep {
	return { state, sounds: [] };
}

function isLastGroup(state: GameState): boolean {
	return state.groupIndex === state.groups.length - 1;
}

function advance(state: GameState, at: number | undefined): GameStep {
	if (state.phase !== 'celebrating') return unchanged(state);
	if (isLastGroup(state)) {
		return { state: { ...state, phase: state.hasFinale ? 'finale' : 'complete' }, sounds: [] };
	}
	const groupIndex = state.groupIndex + 1;
	return {
		state: {
			...state,
			groupIndex,
			session: sessionOf(state.groups, state.starts, groupIndex, state.errorPolicy, at),
			phase: 'typing',
			settled: false,
			errorIndex: null,
			wrongCode: null,
			mood: 'idle'
		},
		sounds: []
	};
}

function type(state: GameState, keystroke: NormalizedKeystroke): GameStep {
	if (state.phase === 'celebrating') {
		return state.settled ? advance(state, keystroke.timestamp) : unchanged(state);
	}
	if (state.phase !== 'typing') return unchanged(state);

	// Enter is a habit at the end of a word, not a mistake, unless the text asks for a line break.
	const expected = state.session.target[state.session.position];
	if (keystroke.kind === 'enter' && expected !== LINE_BREAK) return unchanged(state);

	const step = applyKeystroke(state.session, keystroke);
	if (step.events.length === 0) return unchanged(state);

	let next: GameState = { ...state, session: step.state };
	const sounds: SoundId[] = [];
	for (const event of step.events) {
		if (event.type === 'error') {
			next = {
				...next,
				errorIndex: step.state.position,
				wrongCode: next.charIndex === null ? null : keyCodeForChar(next.charIndex, event.typed),
				mood: 'oops',
				missedChars: next.missedChars.includes(event.expected)
					? next.missedChars
					: [...next.missedChars, event.expected]
			};
			sounds.push('error');
		} else if (event.type === 'correct') {
			next = {
				...next,
				errorIndex: null,
				wrongCode: null,
				mood: next.mood === 'oops' ? 'idle' : next.mood
			};
			sounds.push('correct');
		} else if (event.type === 'completed') {
			const last = isLastGroup(state);
			sounds.pop();
			sounds.push(last ? 'lessonDone' : 'groupDone');
			next = {
				...next,
				finished: [...next.finished, computeMetrics(step.state)],
				typedMs: [...next.typedMs, sessionTypingMs(step.state)],
				phase: 'celebrating',
				errorIndex: null,
				wrongCode: null,
				mood: last ? 'cheer' : 'happy'
			};
		}
	}
	return { state: next, sounds };
}

/** The time of the group being typed stops with the game; a group already done has nothing to stop. */
function stopped(state: GameState, at: number | undefined): SessionState {
	return at === undefined ? state.session : pauseSession(state.session, at);
}

function restarted(state: GameState, at: number | undefined): SessionState {
	const { session } = state;
	// A pause whose end is not known is forgotten rather than left open: the group must take keys again.
	return resumeSession(session, at ?? session.pausedAt ?? 0);
}

export function reduce(state: GameState, action: GameAction): GameStep {
	switch (action.type) {
		case 'keystroke':
			return state.paused ? unchanged(state) : type(state, action.keystroke);
		case 'advance':
			return state.paused ? unchanged(state) : advance(state, action.at);
		case 'calm':
			return state.mood === 'oops'
				? { state: { ...state, mood: 'idle' }, sounds: [] }
				: unchanged(state);
		case 'settle':
			return state.paused || state.phase !== 'celebrating' || state.settled
				? unchanged(state)
				: { state: { ...state, settled: true }, sounds: [] };
		case 'pause':
			return state.paused || state.phase === 'finale' || state.phase === 'complete'
				? unchanged(state)
				: { state: { ...state, paused: true, session: stopped(state, action.at) }, sounds: [] };
		case 'resume':
			return state.paused
				? { state: { ...state, paused: false, session: restarted(state, action.at) }, sounds: [] }
				: unchanged(state);
		case 'finish':
			return state.phase === 'finale'
				? { state: { ...state, phase: 'complete' }, sounds: [] }
				: unchanged(state);
	}
}

/** Number of groups whose reward has been earned so far. */
export function completedCount(state: GameState): number {
	return state.phase === 'typing' ? state.groupIndex : state.groupIndex + 1;
}

/** Metrics of the whole exercise, once every group has been typed. */
export function exerciseMetrics(state: GameState): SessionMetrics {
	return combineMetrics(state.finished);
}

/** What a game reports once every group has been typed. */
export function exerciseOutcome(state: GameState): GameOutcome {
	// The ghost follows the time spent typing: the time spent reading a group is not part of its pace.
	const typed = state.finished.map((metrics, index) => ({
		...metrics,
		elapsedMs: state.typedMs[index] ?? metrics.elapsedMs
	}));
	return { metrics: exerciseMetrics(state), pace: pacePoints(typed) };
}
