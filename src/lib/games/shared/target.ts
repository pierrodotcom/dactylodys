import type { CharIndex, KeyPress } from '../../keyboard/types';

const LINE_BREAK = '\n';
/** The key that ends a line, whatever the layout: `KeyboardEvent.code` names it the same everywhere. */
const ENTER_PRESS: KeyPress = { code: 'Enter', level: 'base' };

/** The key to press for a character: the first press of the first way the layout produces it. */
export function targetKeyPress(
	charIndex: CharIndex,
	expected: string | undefined
): KeyPress | null {
	if (expected === undefined) return null;
	if (expected === LINE_BREAK) return charIndex.get(LINE_BREAK)?.[0]?.[0] ?? ENTER_PRESS;
	return charIndex.get(expected)?.[0]?.[0] ?? null;
}
