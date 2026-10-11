import { parseFingeringProfile } from './fingering';
import { parseLayout } from './layout';
import type { FingeringProfileId, LayoutId } from './layout-ids';
import type { FingeringProfile, LayoutDefinition } from './types';

type JsonLoader = () => Promise<{ default: unknown }>;

const LAYOUT_LOADERS: Readonly<Record<LayoutId, JsonLoader>> = {
	'fr-fr-azerty-pc': () => import('../../../layouts/fr-fr-azerty-pc.json'),
	'fr-fr-azerty-mac': () => import('../../../layouts/fr-fr-azerty-mac.json')
};

const FINGERING_LOADERS: Readonly<Record<FingeringProfileId, JsonLoader>> = {
	'ten-fingers-iso': () => import('../../../layouts/fingering/ten-fingers-iso.json')
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

export async function loadFingeringProfile(id: FingeringProfileId): Promise<FingeringProfile> {
	const module = await findLoader(FINGERING_LOADERS, id, 'fingering profile')();
	const profile = parseFingeringProfile(module.default);
	if (profile.id !== id) throw new Error(`Fingering file for ${id} declares id ${profile.id}`);
	return profile;
}
