import type { RawInputEvent, RawInputEventType } from '$lib/keyboard/types';

export type RawEventListener = (event: RawInputEvent) => void;

interface KeyboardEventLike {
	readonly key: string;
	readonly code: string;
	readonly repeat: boolean;
	readonly isComposing: boolean;
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	getModifierState?(key: string): boolean;
}

interface InputEventLike {
	readonly inputType?: string;
	readonly data?: string | null;
	readonly isComposing?: boolean;
}

interface CompositionEventLike {
	readonly data: string;
}

const KEY_EVENTS = ['keydown', 'keyup'] as const;
const INPUT_EVENTS = ['beforeinput', 'input'] as const;
const COMPOSITION_EVENTS = ['compositionstart', 'compositionupdate', 'compositionend'] as const;
const BLOCKED_EVENTS = ['paste', 'drop'] as const;
const BLOCKED_INPUT_TYPES = new Set(['insertFromPaste', 'insertFromDrop']);

export const CAPTURE_FIELD_ATTRIBUTES = {
	autocomplete: 'off',
	autocorrect: 'off',
	autocapitalize: 'off',
	spellcheck: 'false'
} as const;

export function copyKeyboardEvent(
	type: 'keydown' | 'keyup',
	event: KeyboardEventLike,
	timestamp: number
): RawInputEvent {
	return {
		type,
		timestamp,
		key: event.key,
		code: event.code,
		repeat: event.repeat,
		isComposing: event.isComposing,
		shiftKey: event.shiftKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		metaKey: event.metaKey,
		altGraph: event.getModifierState?.('AltGraph') ?? false
	};
}

export function copyInputEvent(
	type: 'beforeinput' | 'input',
	event: InputEventLike,
	timestamp: number
): RawInputEvent {
	return {
		type,
		timestamp,
		inputType: event.inputType ?? '',
		data: event.data ?? null,
		isComposing: event.isComposing ?? false
	};
}

export function copyCompositionEvent(
	type: Extract<RawInputEventType, `composition${string}`>,
	event: CompositionEventLike,
	timestamp: number
): RawInputEvent {
	return { type, timestamp, data: event.data };
}

/** Forwards the raw events of `target` to `onEvent` and blocks paste and drop. Returns the detach function. */
export function attachKeyboardCapture(
	target: EventTarget,
	onEvent: RawEventListener,
	now: () => number = () => performance.now()
): () => void {
	const listeners: [string, (event: Event) => void][] = [];
	const listen = (type: string, listener: (event: Event) => void) => {
		target.addEventListener(type, listener);
		listeners.push([type, listener]);
	};

	for (const type of KEY_EVENTS) {
		listen(type, (event) => onEvent(copyKeyboardEvent(type, event as never, now())));
	}
	for (const type of INPUT_EVENTS) {
		listen(type, (event) => {
			onEvent(copyInputEvent(type, event as InputEventLike, now()));
			if (BLOCKED_INPUT_TYPES.has((event as InputEventLike).inputType ?? '')) {
				event.preventDefault();
			}
		});
	}
	for (const type of COMPOSITION_EVENTS) {
		listen(type, (event) => onEvent(copyCompositionEvent(type, event as never, now())));
	}
	for (const type of BLOCKED_EVENTS) {
		listen(type, (event) => event.preventDefault());
	}

	return () => {
		for (const [type, listener] of listeners) target.removeEventListener(type, listener);
	};
}
