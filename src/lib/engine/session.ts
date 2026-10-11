import type { NormalizedKeystroke } from '../keyboard/types';
import { toGraphemes } from './graphemes';
import type {
	KeystrokeRecord,
	SessionEvent,
	SessionOptions,
	SessionState,
	SessionStep
} from './types';

export function createSession(text: string, options: Partial<SessionOptions> = {}): SessionState {
	const target = toGraphemes(text);
	if (target.length === 0) {
		throw new RangeError('Session text must not be empty');
	}
	return {
		target,
		position: 0,
		pending: [],
		startedAt: null,
		endedAt: null,
		records: [],
		options: { errorPolicy: options.errorPolicy ?? 'retry' }
	};
}

export function isComplete(state: SessionState): boolean {
	return state.endedAt !== null;
}

export function applyKeystroke(state: SessionState, keystroke: NormalizedKeystroke): SessionStep {
	if (state.endedAt !== null) {
		return ignored(state);
	}
	if (keystroke.kind === 'backspace') {
		return applyBackspace(state, keystroke);
	}
	const typed = typedCharacter(keystroke);
	if (typed === null) {
		return ignored(state);
	}
	return applyCharacter(state, keystroke, typed);
}

function ignored(state: SessionState): SessionStep {
	return { state, events: [] };
}

function typedCharacter(keystroke: NormalizedKeystroke): string | null {
	if (keystroke.kind === 'enter') {
		return '\n';
	}
	if (keystroke.char === null || keystroke.char === '') {
		return null;
	}
	return keystroke.char.normalize('NFC');
}

function applyCharacter(
	state: SessionState,
	keystroke: NormalizedKeystroke,
	typed: string
): SessionStep {
	const expected = state.target[state.position];
	if (expected === undefined) {
		return ignored(state);
	}
	const waitingForErase = state.options.errorPolicy === 'backspace' && state.pending.length > 0;
	const correct = !waitingForErase && typed === expected;
	const record: KeystrokeRecord = {
		targetIndex: state.position,
		expected,
		typed,
		kind: keystroke.kind,
		correct,
		code: keystroke.code,
		timestamp: keystroke.timestamp
	};
	const startedAt = state.startedAt ?? keystroke.timestamp;
	const records = [...state.records, record];

	if (!correct) {
		const pending =
			state.options.errorPolicy === 'backspace' ? [...state.pending, typed] : state.pending;
		const event: SessionEvent = {
			type: 'error',
			index: state.position + state.pending.length,
			expected,
			typed
		};
		return { state: { ...state, pending, startedAt, records }, events: [event] };
	}

	const position = state.position + 1;
	const events: SessionEvent[] = [{ type: 'correct', index: state.position, char: expected }];
	let endedAt: number | null = null;
	if (position === state.target.length) {
		endedAt = keystroke.timestamp;
		events.push({ type: 'completed', endedAt });
	}
	return { state: { ...state, position, startedAt, endedAt, records }, events };
}

function applyBackspace(state: SessionState, keystroke: NormalizedKeystroke): SessionStep {
	const expected = state.target[state.position];
	if (
		state.options.errorPolicy !== 'backspace' ||
		state.pending.length === 0 ||
		expected === undefined
	) {
		return ignored(state);
	}
	const pending = state.pending.slice(0, -1);
	const record: KeystrokeRecord = {
		targetIndex: state.position,
		expected,
		typed: null,
		kind: 'backspace',
		correct: false,
		code: keystroke.code,
		timestamp: keystroke.timestamp
	};
	return {
		state: {
			...state,
			pending,
			startedAt: state.startedAt ?? keystroke.timestamp,
			records: [...state.records, record]
		},
		events: [{ type: 'erased', index: state.position + pending.length }]
	};
}
