import { classifyKey, isShortcut } from '$lib/keyboard/input-adapter/keys';
import type { RawInputEvent } from '$lib/keyboard/types';
import { copyKeyboardEvent } from './capture';

/**
 * Where the keyboard focus is on a screen that waits for typing: in its field, nowhere (the page
 * itself), on a button or a link, or in another control.
 */
export type FocusPlace = 'field' | 'page' | 'button' | 'elsewhere';

/**
 * What a key does to the focus: `take`, the field takes the focus and the key, which is typed in
 * it; `first-button`, the focus goes to the first button of the screen; `none`, the key goes its way.
 */
export type FocusMove = 'take' | 'first-button' | 'none';

interface FocusedElement {
	readonly id: string;
	readonly tagName: string;
}

const PAGE_TAGS = new Set(['BODY', 'HTML']);
const BUTTON_TAGS = new Set(['BUTTON', 'A']);
/** The keys a button answers to itself. */
const BUTTON_KEYS = new Set([' ', 'Enter']);

export function focusPlace(active: FocusedElement | null, fieldId: string): FocusPlace {
	if (active === null || PAGE_TAGS.has(active.tagName)) return 'page';
	if (active.id === fieldId) return 'field';
	return BUTTON_TAGS.has(active.tagName) ? 'button' : 'elsewhere';
}

/**
 * A screen that waits for typing never lets go of the child: a key that writes, pressed while the
 * focus is on the page or on a button, goes to the field; Tab from the field goes to the first
 * button instead of out of the page. Tab, Shift + Tab and Escape are never taken: no keyboard trap
 * (WCAG 2.1.2). The key is only told from a shortcut or a navigation key here: the character it
 * writes is still read where it is written, in the field.
 */
export function typingFocusMove(event: RawInputEvent, place: FocusPlace): FocusMove {
	if (place === 'elsewhere') return 'none';
	if (place === 'field') {
		const plainTab =
			event.key === 'Tab' &&
			event.shiftKey !== true &&
			event.ctrlKey !== true &&
			event.altKey !== true &&
			event.metaKey !== true;
		return plainTab ? 'first-button' : 'none';
	}
	if (isShortcut(event)) return 'none';
	if (place === 'button' && BUTTON_KEYS.has(event.key ?? '')) return 'none';
	const keyClass = classifyKey(event);
	return keyClass === 'modifier' || keyClass === 'other' ? 'none' : 'take';
}

/** The field of the screen, as `KeyboardCaptureField` gives it. */
interface TypingField {
	take(event: KeyboardEvent): void;
}

/**
 * Applies `typingFocusMove` to a key pressed anywhere on the page. `firstButton`: where Tab goes
 * from the field. Returns the move that was made.
 */
export function keepTyping(
	event: KeyboardEvent,
	fieldId: string,
	field: TypingField | undefined,
	firstButton: HTMLElement | null | undefined
): FocusMove {
	if (!field || event.defaultPrevented) return 'none';
	const place = focusPlace(document.activeElement, fieldId);
	const move = typingFocusMove(copyKeyboardEvent('keydown', event, event.timeStamp), place);
	if (move === 'take') {
		field.take(event);
	} else if (move === 'first-button') {
		if (!firstButton) return 'none';
		event.preventDefault();
		firstButton.focus();
	}
	return move;
}
