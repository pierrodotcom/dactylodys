import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
import { loadFingeringProfile, loadGeometry, loadLayout } from '$lib/keyboard/registry';

export const load = async () => ({
	layouts: await Promise.all(LAYOUT_IDS.map((id) => loadLayout(id))),
	geometry: await loadGeometry('iso-105'),
	fingering: await loadFingeringProfile('ten-fingers-iso')
});
