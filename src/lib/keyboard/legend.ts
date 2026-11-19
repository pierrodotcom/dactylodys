import type { KeyCode, KeyOutput, KeyPress, LayoutDefinition } from './types';

/**
 * The signs a real keyboard prints on a key, read from the levels the layout describes: a letter
 * key prints its capital alone; a key whose sign with Shift is another one prints it above the sign
 * without modifier (digits, punctuation); any other key prints one sign. What AltGr or Option
 * writes is left out: a keyboard does not always print it (`extraSign` adds it to the key to press).
 */
export interface KeyLegend {
	/** The sign without modifier, or the capital of a letter key; `''` for the space bar. */
	readonly base: string;
	/** The sign written with Shift, printed above `base`; `null` when the key prints one sign. */
	readonly shifted: string | null;
}

const SPACE = ' ';
const BLANK = '';

/** The sign a level of a key writes: its character, or the sign of a dead key alone. */
function signOf(layout: LayoutDefinition, output: KeyOutput | undefined): string | null {
	if (output === undefined) return null;
	if (typeof output === 'string') return output;
	return Object.hasOwn(layout.deadKeys, output.dead)
		? (layout.deadKeys[output.dead]?.standalone ?? null)
		: null;
}

export function keyLegend(layout: LayoutDefinition, code: KeyCode): KeyLegend | null {
	if (!Object.hasOwn(layout.keys, code)) return null;
	const levels = layout.keys[code];
	const base = signOf(layout, levels?.base ?? levels?.shift);
	if (base === null) return null;
	if (base === SPACE) return { base: BLANK, shifted: null };
	const shifted = signOf(layout, levels?.shift);
	if (shifted === null || shifted === base) return { base, shifted: null };
	const isLetterKey =
		typeof levels?.base === 'string' && shifted === base.toLocaleUpperCase(layout.locale);
	return isLetterKey ? { base: shifted, shifted: null } : { base, shifted };
}

/** The sign a press writes: its character, or the sign of a dead key alone; `null` without it. */
export function pressSign(layout: LayoutDefinition, press: KeyPress): string | null {
	if (!Object.hasOwn(layout.keys, press.code)) return null;
	return signOf(layout, layout.keys[press.code]?.[press.level]);
}

/**
 * The sign the key to press shows besides its legend: the one written with AltGr (Option on a
 * Mac), so that the key lit for « @ » carries « @ ». `null` without AltGr, where the legend prints
 * the sign already, and for a blank sign.
 */
export function extraSign(layout: LayoutDefinition, press: KeyPress): string | null {
	if (press.level === 'base' || press.level === 'shift') return null;
	const sign = pressSign(layout, press);
	if (sign === null || sign.trim() === BLANK) return null;
	const legend = keyLegend(layout, press.code);
	return legend?.base === sign || legend?.shifted === sign ? null : sign;
}
