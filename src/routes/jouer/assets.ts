import { buildCharIndex } from '$lib/keyboard/layout';
import type { GeometryId } from '$lib/keyboard/layout-ids';
import { loadFingeringProfile, loadGeometry, loadLayout } from '$lib/keyboard/registry';
import type {
	CharIndex,
	FingeringProfile,
	KeyboardGeometry,
	KeyboardGeometryDefinition,
	LayoutDefinition
} from '$lib/keyboard/types';
import type { Settings } from '$lib/state/types';

export interface KeyboardAssets {
	readonly layout: LayoutDefinition;
	readonly charIndex: CharIndex;
	readonly geometry: KeyboardGeometryDefinition;
	readonly fingering: FingeringProfile;
}

/** Drawing of the keyboard to use for each physical shape; a shape without an entry is not drawable yet. */
const GEOMETRY_ID_BY_SHAPE: Readonly<Partial<Record<KeyboardGeometry, GeometryId>>> = {
	iso: 'iso-105'
};

export async function loadKeyboardAssets(
	settings: Pick<Settings, 'layoutId' | 'fingeringProfileId'>
): Promise<KeyboardAssets> {
	const layout = await loadLayout(settings.layoutId);
	const geometryId = GEOMETRY_ID_BY_SHAPE[layout.geometry];
	if (geometryId === undefined) {
		throw new Error(`No keyboard drawing for the ${layout.geometry} geometry`);
	}
	const [geometry, fingering] = await Promise.all([
		loadGeometry(geometryId),
		loadFingeringProfile(settings.fingeringProfileId)
	]);
	return { layout, charIndex: buildCharIndex(layout), geometry, fingering };
}
