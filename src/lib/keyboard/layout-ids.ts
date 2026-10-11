export const LAYOUT_IDS = ['fr-fr-azerty-pc', 'fr-fr-azerty-mac'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const FINGERING_PROFILE_IDS = ['ten-fingers-iso'] as const;
export type FingeringProfileId = (typeof FINGERING_PROFILE_IDS)[number];

export const GEOMETRY_IDS = ['iso-105'] as const;
export type GeometryId = (typeof GEOMETRY_IDS)[number];
