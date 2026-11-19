import type { AmbienceId } from '$lib/audio/ambience';
import type { FingeringProfileId, LayoutId } from '$lib/keyboard/layout-ids';
import { m } from '$lib/paraglide/messages.js';

/** Typed on `LayoutId`: adding a layout without its name does not compile. */
export const LAYOUT_LABELS: Readonly<Record<LayoutId, () => string>> = {
	'fr-fr-azerty-pc': m.play_layout_fr_fr_azerty_pc,
	'fr-fr-azerty-mac': m.play_layout_fr_fr_azerty_mac
};

/** Typed on `FingeringProfileId`: adding a fingering without its name does not compile. */
export const FINGERING_LABELS: Readonly<Record<FingeringProfileId, () => string>> = {
	'ten-fingers-iso': m.settings_fingering_ten,
	'six-fingers-iso': m.settings_fingering_six,
	'two-index-iso': m.settings_fingering_two_index
};

/**
 * Typed on `FingeringProfileId`: the fingerings that type every key with the two index fingers.
 * Going to or from one of them moves almost every key to another finger, not only those of the edge.
 */
const INDEX_ONLY: Readonly<Record<FingeringProfileId, boolean>> = {
	'ten-fingers-iso': false,
	'six-fingers-iso': false,
	'two-index-iso': true
};

/** What the adult reads under the choice of the fingering once changed: what changes for the child. */
export function fingeringChangeNote(from: FingeringProfileId, to: FingeringProfileId): string {
	if (INDEX_ONLY[to]) return m.settings_fingering_changed_two_index();
	if (INDEX_ONLY[from]) return m.settings_fingering_changed_from_two_index();
	return m.settings_fingering_changed();
}

/** Typed on `AmbienceId`: adding a background sound without its name does not compile. */
export const AMBIENCE_LABELS: Readonly<Record<AmbienceId, () => string>> = {
	'soft-noise': m.settings_ambience_soft_noise
};
