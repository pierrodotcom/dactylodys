import type { CharIndex, KeyPress } from '../../keyboard/types';

/** The key to press for a character: the first press of the first way the layout produces it. */
export function targetKeyPress(
	charIndex: CharIndex,
	expected: string | undefined
): KeyPress | null {
	if (expected === undefined) return null;
	return charIndex.get(expected)?.[0]?.[0] ?? null;
}
