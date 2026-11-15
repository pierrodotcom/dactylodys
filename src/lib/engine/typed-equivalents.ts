const SPACE = ' ';
const NO_BREAK_SPACE = '\u00A0';
const NARROW_NO_BREAK_SPACE = '\u202F';

/**
 * Characters that count for the expected one although they are another character: what a keyboard
 * writes in its place without the child meaning it, and that nothing on screen tells apart. The
 * table reads one way only, from the expected character to what may be typed for it.
 *
 * A no-break space for a space: Option + Space on a Mac, and the same slip on other layouts.
 */
export const TYPED_EQUIVALENTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
	[SPACE, new Set([NO_BREAK_SPACE, NARROW_NO_BREAK_SPACE])]
]);

/** Whether the typed character is a good key for the expected one. */
export function countsAs(typed: string, expected: string): boolean {
	return typed === expected || (TYPED_EQUIVALENTS.get(expected)?.has(typed) ?? false);
}
