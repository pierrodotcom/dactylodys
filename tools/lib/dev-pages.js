/**
 * The trial pages of `/dev` that the published site keeps (ADR-075): the one asked of keyboard
 * testers and the one that records the voice. The others are tools of the team: they open with
 * `npm run dev` and in the end-to-end tests, and stay out of the site children download.
 */
export const PUBLISHED_DEV_PAGES = ['traces', 'voix'];

/**
 * Set at build time, keeps every trial page in the site: only `npm run build:e2e` sets it, so a
 * build made without thinking of it never publishes them.
 */
export const ALL_DEV_PAGES = { variable: 'VITE_DEV_PAGES', value: 'all' };

/** Where the site with every trial page is written, so that it never replaces the published one. */
export const E2E_SITE_DIRECTORY = '.svelte-kit/site-with-dev-pages';

const DEV_ROUTE = /^\/dev\/([^/]+)/;
const DEV_ROUTE_FILE = /\/src\/routes\/dev\/([^/]+)\/\+page\.(?:svelte|ts)$/;

/** @param {string | undefined} name */
function isInternal(name) {
	return name !== undefined && !PUBLISHED_DEV_PAGES.includes(name);
}

/**
 * Whether a route, or an address without the base path of the site, is a trial page left out of
 * the published site.
 *
 * @param {string} route
 */
export function isInternalDevRoute(route) {
	return isInternal(DEV_ROUTE.exec(route)?.[1]);
}

/**
 * Whether a source file is the page of a trial page left out of the published site. A module made
 * from such a file (its style, asked with a query) is not the file itself.
 *
 * @param {string} file
 */
export function isInternalDevPageFile(file) {
	return isInternal(DEV_ROUTE_FILE.exec(file.replaceAll('\\', '/'))?.[1]);
}
