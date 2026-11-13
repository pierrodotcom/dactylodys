import type { NormalizedKeystroke } from '../keyboard/types';
import { toGraphemes } from './graphemes';
import type {
	KeystrokeRecord,
	SessionEvent,
	SessionSetup,
	SessionStart,
	SessionState,
	SessionStep
} from './types';

const LINE_BREAK = '\n';
const CONTROL_PATTERN = /\p{Cc}/u;

export function createSession(text: string, options: SessionSetup = {}): SessionState {
	const target = toGraphemes(text);
	if (target.length === 0) {
		throw new RangeError('Session text must not be empty');
	}
	const { start } = options;
	if (start !== undefined) checkStart(target, start);
	return {
		target,
		position: start?.typed ?? 0,
		pending: start === undefined ? [] : start.pending.map((char) => char.normalize('NFC')),
		startedAt: null,
		endedAt: null,
		records: [],
		// Mistakes already written can only be erased: the group asks for Backspace, whatever the setting.
		options: { errorPolicy: start === undefined ? (options.errorPolicy ?? 'retry') : 'backspace' }
	};
}

function checkStart(target: readonly string[], start: SessionStart): void {
	const { typed, pending } = start;
	if (!Number.isSafeInteger(typed) || typed < 0 || typed >= target.length) {
		throw new RangeError('A session start must leave at least one grapheme to type');
	}
	if (pending.length === 0) {
		throw new RangeError('A session start needs at least one wrong character to erase');
	}
	for (const char of pending) {
		const graphemes = toGraphemes(char);
		if (graphemes.length !== 1 || graphemes[0] === LINE_BREAK || CONTROL_PATTERN.test(char)) {
			throw new RangeError('A wrong character of a session start must be one printable grapheme');
		}
	}
	if (pending[0]?.normalize('NFC') === target[typed]) {
		throw new RangeError(
			'The first wrong character of a session start must not be the expected one'
		);
	}
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
