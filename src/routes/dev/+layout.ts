import { error } from '@sveltejs/kit';
import { isInternalDevRoute } from '../../../tools/lib/dev-pages.js';
import type { LayoutLoad } from './$types';

/*
 * The published site keeps two trial pages only (ADR-075). The others answer « not found » there,
 * so no file is written for them; they open with `npm run dev` and in the site built for the
 * end-to-end tests (`npm run build:e2e`, which sets the variable named in `tools/lib/dev-pages.js`).
 * Vite replaces the variable only when it is written in full.
 */
const EVERY_PAGE_OPEN = import.meta.env.DEV || import.meta.env.VITE_DEV_PAGES === 'all';

export const load: LayoutLoad = ({ route }) => {
	if (!EVERY_PAGE_OPEN && isInternalDevRoute(route.id)) error(404);
};
