import type { RawInputEvent } from '../types';
import { splitGraphemes } from './graphemes';

const MODIFIER_KEYS = new Set([
	'Shift',
	'Control',
	'Alt',
	'AltGraph',
	'Meta',
	'OS',
	'Super',
	'Hyper',
	'CapsLock',
	'NumLock',
	'ScrollLock',
	'Fn',
	'FnLock',
	'Symbol',
	'SymbolLock'
]);

const MODIFIER_CODES =
	/^(Shift|Control|Alt|Meta|OS)(Left|Right)$|^(CapsLock|NumLock|ScrollLock|Fn)$/;
const AMBIGUOUS_KEYS = new Set(['Process', 'Unidentified']);
const SINGLE_CONTROL = /^\p{Cc}$/u;

export type KeyClass =
	'modifier' | 'dead' | 'backspace' | 'enter' | 'printable' | 'ambiguous' | 'other';

export function classifyKey(event: RawInputEvent): KeyClass {
	const key = event.key ?? '';
	if (MODIFIER_KEYS.has(key) || MODIFIER_CODES.test(event.code ?? '')) return 'modifier';
	if (key === 'Dead') return 'dead';
	if (key === 'Backspace') return 'backspace';
	if (key === 'Enter') return 'enter';
	if (AMBIGUOUS_KEYS.has(key)) return 'ambiguous';
	if (key !== '' && !SINGLE_CONTROL.test(key) && splitGraphemes(key).length === 1) {
		return 'printable';
	}
	return 'other';
}

/** Ctrl+Alt is how Windows reports AltGr, so it is not a shortcut. */
export function isShortcut(event: RawInputEvent): boolean {
	if (event.metaKey === true) return true;
	if (event.ctrlKey !== true) return false;
	return !(event.altGraph === true || event.altKey === true);
}
