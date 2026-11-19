export const LAYOUT_IDS = ['fr-fr-azerty-pc', 'fr-fr-azerty-mac'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

/** In the order the adult reads them: ten fingers first, the default (ADR-075, choice 6). */
export const FINGERING_PROFILE_IDS = [
	'ten-fingers-iso',
	'six-fingers-iso',
	'two-index-iso'
] as const;
export type FingeringProfileId = (typeof FINGERING_PROFILE_IDS)[number];

export const GEOMETRY_IDS = ['iso-105'] as const;
export type GeometryId = (typeof GEOMETRY_IDS)[number];
