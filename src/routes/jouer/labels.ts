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

/** Typed on `AmbienceId`: adding a background sound without its name does not compile. */
export const AMBIENCE_LABELS: Readonly<Record<AmbienceId, () => string>> = {
	'soft-noise': m.settings_ambience_soft_noise
};
