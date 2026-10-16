import { getContext, setContext } from 'svelte';

/** What the companion wears and its colour, wherever it is drawn (lot R2, ADR-036). */
export interface CompanionAppearance {
	/** `CompanionColor.id`; `null`: the colour it comes with. */
	readonly colorId: string | null;
	/** `RewardDefinition.artId` of each worn item, one per slot (`resolveCompanion`). */
	readonly itemArtIds: readonly string[];
}

export const PLAIN_APPEARANCE: CompanionAppearance = { colorId: null, itemArtIds: [] };

const KEY = Symbol('companion-appearance');

/**
 * Called once by the route that knows the profile, so that every companion below it (map, result,
 * games, break) wears the same things without each screen passing them on.
 */
export function provideCompanionAppearance(read: () => CompanionAppearance): void {
	setContext(KEY, read);
}

/** The appearance given by an ancestor, or the plain companion when there is none (dev pages, tests). */
export function companionAppearance(): () => CompanionAppearance {
	return getContext<(() => CompanionAppearance) | undefined>(KEY) ?? (() => PLAIN_APPEARANCE);
}
