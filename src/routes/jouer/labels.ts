import type { LayoutId } from '$lib/keyboard/layout-ids';
import { m } from '$lib/paraglide/messages.js';

/** Typed on `LayoutId`: adding a layout without its name does not compile. */
export const LAYOUT_LABELS: Readonly<Record<LayoutId, () => string>> = {
	'fr-fr-azerty-pc': m.play_layout_fr_fr_azerty_pc,
	'fr-fr-azerty-mac': m.play_layout_fr_fr_azerty_mac
};
