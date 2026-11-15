import { keyLabel } from '$lib/ui/components/key-labels';
import type { KeyCode, LayoutDefinition, NormalizedKeystroke } from '$lib/keyboard/types';

export interface CheckStep {
	/**
	 * Key of the layout that writes the character. It says which key is asked for; it is never
	 * compared with the physical key the browser reports.
	 */
	readonly code: KeyCode;
	/** Character the layout produces on that key without modifier. */
	readonly char: string;
	/** What is printed on the key, shown to the child. */
	readonly label: string;
	/**
	 * The other character printed on the key, above the one asked for (the 2 of the é key of an
	 * AZERTY keyboard): the key is drawn as the child sees it. `null` for a key that shows one.
	 */
	readonly above: string | null;
}

export type CheckOutcome = 'match' | 'mismatch';

/** Rules of the check that do not depend on the layout. */
export const CHECK_RULES = {
	/** Differences in a row from which the child is told to ask an adult. */
	adultHelpFromMismatch: 2
} as const;

/** Steps for the physical keys `codes`, in order; keys that do not produce a plain character are skipped. */
export function chooseCheckSteps(layout: LayoutDefinition, codes: readonly KeyCode[]): CheckStep[] {
	return codes.flatMap((code) => {
		const levels = Object.hasOwn(layout.keys, code) ? layout.keys[code] : undefined;
		const base = levels?.base;
		const label = keyLabel(layout, code);
		if (typeof base !== 'string' || base.trim() === '' || label === null || label === '') return [];
		const shifted = levels?.shift;
		const above =
			typeof shifted === 'string' && shifted.trim() !== '' && shifted !== label && shifted !== base
				? shifted
				: null;
		return [{ code, char: base, label, above }];
	});
}

/**
 * The produced character is what counts, as in the games; Caps Lock does not change the key.
 * The physical key the browser reports is not compared: a browser that resists fingerprinting
 * reports the keys of an American keyboard for a real AZERTY one, and a system set to another
 * language reports the right key while it writes another letter. The other character printed on
 * the key is refused: it is what a keyboard of another family writes there.
 */
export function stepMatches(step: CheckStep, keystroke: NormalizedKeystroke): boolean {
	return keystroke.char?.toLowerCase() === step.char.toLowerCase();
}

export function checkOutcome(matches: readonly boolean[]): CheckOutcome {
	return matches.length > 0 && matches.every(Boolean) ? 'match' : 'mismatch';
}

/** A check in progress or over. Immutable; every answer yields a new state. */
export interface CheckState {
	readonly steps: readonly CheckStep[];
	/** One answer per step already asked: whether the key wrote the expected character. */
	readonly answers: readonly boolean[];
	/** `null` while keys remain to ask for. Two results, never a third one. */
	readonly outcome: CheckOutcome | null;
	/** Checks that ended on a difference, one after the other, this one included. */
	readonly mismatchesInARow: number;
}

export type CheckAction =
	/** A key was pressed for the current step. */
	| { readonly type: 'typed'; readonly keystroke: NormalizedKeystroke }
	/** The child does not find the key of the current step: a difference, without blame. */
	| { readonly type: 'not-found' }
	/** After a difference, the keys are asked for again. */
	| { readonly type: 'retry' };

function asked(
	steps: readonly CheckStep[],
	answers: readonly boolean[],
	mismatchesBefore: number
): CheckState {
	const outcome = answers.length < steps.length ? null : checkOutcome(answers);
	return {
		steps,
		answers,
		outcome,
		mismatchesInARow: outcome === 'mismatch' ? mismatchesBefore + 1 : mismatchesBefore
	};
}

/** A layout with no key to check has nothing to say it is the right one: a difference at once. */
export function startCheck(steps: readonly CheckStep[]): CheckState {
	return asked(steps, [], 0);
}

/** The key asked for now; `undefined` once the result is known. */
export function currentStep(state: CheckState): CheckStep | undefined {
	return state.outcome === null ? state.steps[state.answers.length] : undefined;
}

export function reduceCheck(state: CheckState, action: CheckAction): CheckState {
	if (action.type === 'retry') {
		return state.outcome === 'mismatch' ? asked(state.steps, [], state.mismatchesInARow) : state;
	}
	const step = currentStep(state);
	if (step === undefined) return state;
	if (action.type === 'not-found') {
		return asked(state.steps, [...state.answers, false], state.mismatchesInARow);
	}
	if (action.keystroke.kind !== 'char') return state;
	const answer = stepMatches(step, action.keystroke);
	return asked(state.steps, [...state.answers, answer], state.mismatchesInARow);
}

/** Trying again did not help: the child is told to ask an adult to look at the keyboard. */
export function needsAdultHelp(state: CheckState): boolean {
	return (
		state.outcome === 'mismatch' && state.mismatchesInARow >= CHECK_RULES.adultHelpFromMismatch
	);
}
