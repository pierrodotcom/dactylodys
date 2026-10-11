import type { InputNormalizer, KeyCode, NormalizedKeystroke, RawInputEvent } from '../types';
import { toTypedGraphemes } from './graphemes';
import { classifyKey, isShortcut } from './keys';

const INSERT_TEXT = 'insertText';
const INSERT_FROM_COMPOSITION = 'insertFromComposition';
const DELETE_BACKWARD = 'deleteContentBackward';
const LINE_BREAKS = new Set(['insertLineBreak', 'insertParagraph']);

interface KeyContext {
	readonly code: KeyCode | null;
	readonly timestamp: number;
}

interface PendingChar extends KeyContext {
	readonly char: string;
	readonly composed: boolean;
}

interface State {
	/** Last non-modifier key held down, until its keyup. */
	lastKeydown: KeyContext | null;
	/** Printable keydown waiting to see whether an input event follows. */
	fallback: PendingChar | null;
	/** `beforeinput` already handled: the matching `input` describes the same edit. */
	expectedInputType: string | null;
	/** Backspace or Enter already emitted from `keydown`; their input events are duplicates. */
	handledKey: 'backspace' | 'enter' | null;
	/** Auto-repeat or shortcut: the input events of this stroke are not typing. */
	skipInputs: boolean;
	deadPending: boolean;
	inComposition: boolean;
	/** Text just emitted at `compositionend`; browsers repeat it in a later input event. */
	recentCommit: string | null;
	/** Characters were emitted with no keydown (Safari fires `keydown` after the input). */
	orphan: boolean;
}

function initialState(): State {
	return {
		lastKeydown: null,
		fallback: null,
		expectedInputType: null,
		handledKey: null,
		skipInputs: false,
		deadPending: false,
		inComposition: false,
		recentCommit: null,
		orphan: false
	};
}

function emitChars(
	state: State,
	text: string,
	composed: boolean,
	eventTimestamp: number
): NormalizedKeystroke[] {
	const context = state.lastKeydown;
	const chars = toTypedGraphemes(text);
	if (chars.length === 0) return [];
	state.fallback = null;
	state.deadPending = false;
	state.orphan = context === null;
	return chars.map((char) => ({
		kind: 'char',
		char,
		code: context?.code ?? null,
		timestamp: context?.timestamp ?? eventTimestamp,
		composed
	}));
}

function emitKey(
	state: State,
	kind: 'backspace' | 'enter',
	eventTimestamp: number
): NormalizedKeystroke[] {
	const context = state.lastKeydown;
	state.fallback = null;
	state.deadPending = false;
	state.orphan = context === null;
	return [
		{
			kind,
			char: null,
			code: context?.code ?? null,
			timestamp: context?.timestamp ?? eventTimestamp,
			composed: false
		}
	];
}

function flushFallback(state: State): NormalizedKeystroke[] {
	const pending = state.fallback;
	state.fallback = null;
	if (pending === null) return [];
	const chars = toTypedGraphemes(pending.char);
	state.deadPending = false;
	return chars.map((char) => ({
		kind: 'char',
		char,
		code: pending.code,
		timestamp: pending.timestamp,
		composed: pending.composed
	}));
}

function onKeydown(state: State, event: RawInputEvent): NormalizedKeystroke[] {
	const keyClass = classifyKey(event);
	if (keyClass === 'modifier') return [];

	const out = flushFallback(state);
	const orphan = state.orphan;
	state.orphan = false;
	state.skipInputs = false;
	state.handledKey = null;
	state.expectedInputType = null;
	state.recentCommit = null;

	if (isShortcut(event)) {
		state.skipInputs = true;
		state.lastKeydown = null;
		return out;
	}

	const code = event.code ? event.code : null;
	const context: KeyContext = { code, timestamp: event.timestamp };
	const repeat = event.repeat === true;

	switch (keyClass) {
		case 'backspace': {
			state.lastKeydown = context;
			state.handledKey = 'backspace';
			if (state.inComposition || state.deadPending) {
				state.deadPending = false;
				return out;
			}
			out.push(...emitKey(state, 'backspace', event.timestamp));
			return out;
		}
		case 'enter': {
			state.lastKeydown = context;
			state.handledKey = 'enter';
			if (state.inComposition || repeat) return out;
			out.push(...emitKey(state, 'enter', event.timestamp));
			return out;
		}
		case 'dead': {
			state.lastKeydown = context;
			if (!repeat) state.deadPending = true;
			return out;
		}
		case 'printable': {
			state.lastKeydown = context;
			if (repeat) {
				state.skipInputs = true;
				return out;
			}
			if (event.isComposing === true || state.inComposition || orphan) return out;
			state.fallback = {
				...context,
				char: event.key ?? '',
				composed: state.deadPending
			};
			return out;
		}
		case 'ambiguous': {
			state.lastKeydown = context;
			return out;
		}
		default: {
			state.lastKeydown = null;
			state.deadPending = false;
			return out;
		}
	}
}

function onKeyup(state: State, event: RawInputEvent): NormalizedKeystroke[] {
	if (classifyKey(event) === 'modifier') return [];

	const code = event.code ? event.code : null;
	const out: NormalizedKeystroke[] = [];
	const fallback = state.fallback;
	if (fallback !== null && (code === null || fallback.code === null || fallback.code === code)) {
		out.push(...flushFallback(state));
	}

	const current = state.lastKeydown;
	if (current === null || code === null || current.code === null || current.code === code) {
		state.lastKeydown = null;
		state.skipInputs = false;
		state.handledKey = null;
		state.expectedInputType = null;
		state.recentCommit = null;
	}
	return out;
}

function onTextInput(state: State, event: RawInputEvent, inputType: string): NormalizedKeystroke[] {
	const data = event.data ?? '';
	if (data === '' || state.inComposition) return [];
	if (state.recentCommit !== null && data.normalize('NFC') === state.recentCommit) return [];
	const composed = inputType === INSERT_FROM_COMPOSITION || state.deadPending;
	return emitChars(state, data, composed, event.timestamp);
}

function onInput(
	state: State,
	event: RawInputEvent,
	phase: 'beforeinput' | 'input'
): NormalizedKeystroke[] {
	const inputType = event.inputType ?? '';

	if (phase === 'input' && state.expectedInputType === inputType) {
		state.expectedInputType = null;
		return [];
	}
	const handledType =
		inputType === INSERT_TEXT ||
		inputType === INSERT_FROM_COMPOSITION ||
		inputType === DELETE_BACKWARD ||
		LINE_BREAKS.has(inputType);
	state.expectedInputType = phase === 'beforeinput' && handledType ? inputType : null;

	if (state.skipInputs) return [];

	if (inputType === DELETE_BACKWARD) {
		if (state.handledKey === 'backspace' || state.inComposition) return [];
		return emitKey(state, 'backspace', event.timestamp);
	}
	if (LINE_BREAKS.has(inputType)) {
		if (state.handledKey === 'enter' || state.inComposition) return [];
		return emitKey(state, 'enter', event.timestamp);
	}
	if (inputType === INSERT_TEXT || inputType === INSERT_FROM_COMPOSITION) {
		return onTextInput(state, event, inputType);
	}
	return [];
}

function onCompositionStart(state: State): NormalizedKeystroke[] {
	state.inComposition = true;
	state.fallback = null;
	state.recentCommit = null;
	state.expectedInputType = null;
	return [];
}

function onCompositionEnd(state: State, event: RawInputEvent): NormalizedKeystroke[] {
	state.inComposition = false;
	state.fallback = null;
	state.expectedInputType = null;
	const data = event.data ?? '';
	const out = emitChars(state, data, true, event.timestamp);
	state.deadPending = false;
	if (out.length > 0) state.recentCommit = data.normalize('NFC');
	return out;
}

function handle(state: State, event: RawInputEvent): NormalizedKeystroke[] {
	switch (event.type) {
		case 'keydown':
			return onKeydown(state, event);
		case 'keyup':
			return onKeyup(state, event);
		case 'beforeinput':
		case 'input':
			return onInput(state, event, event.type);
		case 'compositionstart':
			return onCompositionStart(state);
		case 'compositionupdate':
			state.inComposition = true;
			return [];
		case 'compositionend':
			return onCompositionEnd(state, event);
		default:
			return [];
	}
}

export function createInputNormalizer(): InputNormalizer {
	let state = initialState();
	return {
		push: (event) => handle(state, event),
		reset: () => {
			state = initialState();
		}
	};
}
