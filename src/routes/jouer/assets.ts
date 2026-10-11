import { buildCharIndex } from '$lib/keyboard/layout';
import {
	geometryIdFor,
	loadFingeringProfile,
	loadGeometry,
	loadLayout
} from '$lib/keyboard/registry';
import type {
	CharIndex,
	FingeringProfile,
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

export async function loadKeyboardAssets(
	settings: Pick<Settings, 'layoutId' | 'fingeringProfileId'>
): Promise<KeyboardAssets> {
	const layout = await loadLayout(settings.layoutId);
	const [geometry, fingering] = await Promise.all([
		loadGeometry(geometryIdFor(layout)),
		loadFingeringProfile(settings.fingeringProfileId)
	]);
	return { layout, charIndex: buildCharIndex(layout), geometry, fingering };
}
