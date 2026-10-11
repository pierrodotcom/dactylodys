import { parseFingeringProfile } from './fingering';
import { parseGeometry } from './geometry';
import { parseLayout } from './layout';
import type { FingeringProfileId, GeometryId, LayoutId } from './layout-ids';
import type { FingeringProfile, KeyboardGeometryDefinition, LayoutDefinition } from './types';

type JsonLoader = () => Promise<{ default: unknown }>;

const LAYOUT_LOADERS: Readonly<Record<LayoutId, JsonLoader>> = {
	'fr-fr-azerty-pc': () => import('../../../layouts/fr-fr-azerty-pc.json'),
	'fr-fr-azerty-mac': () => import('../../../layouts/fr-fr-azerty-mac.json')
};

const FINGERING_LOADERS: Readonly<Record<FingeringProfileId, JsonLoader>> = {
	'ten-fingers-iso': () => import('../../../layouts/fingering/ten-fingers-iso.json')
};

const GEOMETRY_LOADERS: Readonly<Record<GeometryId, JsonLoader>> = {
	'iso-105': () => import('../../../layouts/geometry/iso-105.json')
};

function findLoader<Id extends string>(
	loaders: Readonly<Record<Id, JsonLoader>>,
	id: Id,
	kind: string
): JsonLoader {
	if (!Object.hasOwn(loaders, id)) throw new Error(`Unknown ${kind} id: ${String(id)}`);
	return loaders[id];
}

export async function loadLayout(id: LayoutId): Promise<LayoutDefinition> {
	const module = await findLoader(LAYOUT_LOADERS, id, 'layout')();
	const layout = parseLayout(module.default);
	if (layout.id !== id) throw new Error(`Layout file for ${id} declares id ${layout.id}`);
	return layout;
}

export async function loadGeometry(id: GeometryId): Promise<KeyboardGeometryDefinition> {
	const module = await findLoader(GEOMETRY_LOADERS, id, 'geometry')();
	const geometry = parseGeometry(module.default);
	if (geometry.id !== id) throw new Error(`Geometry file for ${id} declares id ${geometry.id}`);
	return geometry;
}

export async function loadFingeringProfile(id: FingeringProfileId): Promise<FingeringProfile> {
	const module = await findLoader(FINGERING_LOADERS, id, 'fingering profile')();
	const profile = parseFingeringProfile(module.default);
	if (profile.id !== id) throw new Error(`Fingering file for ${id} declares id ${profile.id}`);
	return profile;
}
