import { parseProgression } from '$lib/engine/progression/definition';
import type { ProgressionDefinition } from '$lib/engine/progression/types';
import type { LayoutId } from '$lib/keyboard/layout-ids';
import azertyDecouverte from '../../../content/fr/progression/azerty-decouverte.json';

const PROGRESSIONS: readonly ProgressionDefinition[] = [parseProgression(azertyDecouverte)];

/** The first progression designed for the layout, `undefined` when there is none. */
export function progressionFor(layoutId: LayoutId): ProgressionDefinition | undefined {
	return PROGRESSIONS.find((progression) => progression.layoutIds.includes(layoutId));
}
