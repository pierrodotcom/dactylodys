import { keyLabel } from '$lib/ui/components/key-labels';
import type { KeyCode, LayoutDefinition, NormalizedKeystroke } from '$lib/keyboard/types';

export interface CheckStep {
	/** Physical key the layout expects. */
	readonly code: KeyCode;
	/** Character the layout produces on that key without modifier. */
	readonly char: string;
	/** What is printed on the key, shown to the child. */
	readonly label: string;
}

export type CheckOutcome = 'match' | 'mismatch';

/** Steps for the physical keys `codes`, in order; keys that do not produce a plain character are skipped. */
export function chooseCheckSteps(layout: LayoutDefinition, codes: readonly KeyCode[]): CheckStep[] {
	return codes.flatMap((code) => {
		const base = Object.hasOwn(layout.keys, code) ? layout.keys[code]?.base : undefined;
		const label = keyLabel(layout, code);
		if (typeof base !== 'string' || base.trim() === '' || label === null || label === '') return [];
		return [{ code, char: base, label }];
	});
}

/**
 * The produced character is what counts, as in the games; Caps Lock does not change the key.
 * The physical key the browser reports is not compared: a browser that resists fingerprinting
 * reports the keys of an American keyboard for a real AZERTY one, and a system set to another
 * language reports the right key while it writes another letter.
 */
export function stepMatches(step: CheckStep, keystroke: NormalizedKeystroke): boolean {
	return keystroke.char?.toLowerCase() === step.char.toLowerCase();
}

export function checkOutcome(matches: readonly boolean[]): CheckOutcome {
	return matches.length > 0 && matches.every(Boolean) ? 'match' : 'mismatch';
}
