import type { SoundId } from '../../audio/sounds';
import { combineMetrics, computeMetrics } from '../../engine/metrics';
import { applyKeystroke, createSession } from '../../engine/session';
import type { ErrorPolicy, SessionMetrics, SessionState } from '../../engine/types';
import type { KeyCode, NormalizedKeystroke } from '../../keyboard/types';

const LINE_BREAK = '\n';

export type HatchingMood = 'idle' | 'happy' | 'oops' | 'cheer';

/**
 * `typing`: the egg of the current group is being typed.
 * `hatched`: the group is done, the baby dino is out and the next egg is on its way.
 * `complete`: the last baby has been celebrated; the game reports its outcome.
 */
export type HatchingPhase = 'typing' | 'hatched' | 'complete';

export interface HatchingState {
	readonly groups: readonly string[];
	readonly errorPolicy: ErrorPolicy;
	readonly groupIndex: number;
	readonly session: SessionState;
	/** Metrics of the groups already typed, in order. */
	readonly finished: readonly SessionMetrics[];
	readonly phase: HatchingPhase;
	readonly paused: boolean;
	/** Index in the current group of the character that was mistyped, `null` when there is none. */
	readonly errorIndex: number | null;
	/** Physical key of the last mistake, shown on the keyboard until the next good key. */
	readonly wrongCode: KeyCode | null;
	readonly mood: HatchingMood;
}

export type HatchingAction =
	| { readonly type: 'keystroke'; readonly keystroke: NormalizedKeystroke }
	/** The time given to the baby dino is over. */
	| { readonly type: 'advance' }
	/** The moment after a mistake is over. */
	| { readonly type: 'calm' }
	| { readonly type: 'pause' }
	| { readonly type: 'resume' };

export interface HatchingStep {
	readonly state: HatchingState;
	/** Sounds to play, in order. */
	readonly sounds: readonly SoundId[];
}

export function createHatching(groups: readonly string[], errorPolicy: ErrorPolicy): HatchingState {
	const first = groups[0];
	if (first === undefined) throw new RangeError('An exercise needs at least one group');
	return {
		groups,
		errorPolicy,
		groupIndex: 0,
		session: createSession(first, { errorPolicy }),
		finished: [],
		phase: 'typing',
		paused: false,
		errorIndex: null,
		wrongCode: null,
		mood: 'idle'
	};
}

function unchanged(state: HatchingState): HatchingStep {
	return { state, sounds: [] };
}

function isLastGroup(state: HatchingState): boolean {
	return state.groupIndex === state.groups.length - 1;
}

function advance(state: HatchingState): HatchingStep {
	if (state.phase !== 'hatched') return unchanged(state);
	if (isLastGroup(state)) return { state: { ...state, phase: 'complete' }, sounds: [] };
	const groupIndex = state.groupIndex + 1;
	const next = state.groups[groupIndex] as string;
	return {
		state: {
			...state,
			groupIndex,
			session: createSession(next, { errorPolicy: state.errorPolicy }),
			phase: 'typing',
			errorIndex: null,
			wrongCode: null,
			mood: 'idle'
		},
		sounds: []
	};
}

function type(state: HatchingState, keystroke: NormalizedKeystroke): HatchingStep {
	if (state.phase === 'hatched') return advance(state);
	if (state.phase !== 'typing') return unchanged(state);

	// Enter is a habit at the end of a word, not a mistake, unless the text asks for a line break.
	const expected = state.session.target[state.session.position];
	if (keystroke.kind === 'enter' && expected !== LINE_BREAK) return unchanged(state);

	const step = applyKeystroke(state.session, keystroke);
	if (step.events.length === 0) return unchanged(state);

	let next: HatchingState = { ...state, session: step.state };
	const sounds: SoundId[] = [];
	for (const event of step.events) {
		if (event.type === 'error') {
			next = { ...next, errorIndex: event.index, wrongCode: keystroke.code, mood: 'oops' };
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
				phase: 'hatched',
				errorIndex: null,
				wrongCode: null,
				mood: last ? 'cheer' : 'happy'
			};
		}
	}
	return { state: next, sounds };
}

export function reduce(state: HatchingState, action: HatchingAction): HatchingStep {
	switch (action.type) {
		case 'keystroke':
			return state.paused ? unchanged(state) : type(state, action.keystroke);
		case 'advance':
			return state.paused ? unchanged(state) : advance(state);
		case 'calm':
			return state.mood === 'oops'
				? { state: { ...state, mood: 'idle' }, sounds: [] }
				: unchanged(state);
		case 'pause':
			return state.paused || state.phase === 'complete'
				? unchanged(state)
				: { state: { ...state, paused: true }, sounds: [] };
		case 'resume':
			return state.paused ? { state: { ...state, paused: false }, sounds: [] } : unchanged(state);
	}
}

/** Number of eggs that have hatched so far. */
export function hatchedCount(state: HatchingState): number {
	return state.phase === 'typing' ? state.groupIndex : state.groupIndex + 1;
}

/** Cracks to draw on the egg being typed: more as the group advances, at least one after a first good key. */
export function crackStage(position: number, length: number, stageCount: number): number {
	if (length <= 0 || position <= 0) return 0;
	return Math.min(stageCount, Math.ceil((stageCount * position) / length));
}

/** Metrics of the whole exercise, once every group has been typed. */
export function exerciseMetrics(state: HatchingState): SessionMetrics {
	return combineMetrics(state.finished);
}
