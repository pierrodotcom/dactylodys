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
 * The physical key is what counts. When the browser did not tell which key it was
 * (some browsers send the key event after the text), the produced character is compared instead.
 */
export function stepMatches(step: CheckStep, keystroke: NormalizedKeystroke): boolean {
	if (keystroke.code !== null) return keystroke.code === step.code;
	return keystroke.char === step.char;
}

export function checkOutcome(matches: readonly boolean[]): CheckOutcome {
	return matches.length > 0 && matches.every(Boolean) ? 'match' : 'mismatch';
}
