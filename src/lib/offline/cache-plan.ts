/** Every cache of the site starts with this: the service worker never touches another one. */
export const CACHE_PREFIX = 'dactylodys-site-';

/** One cache per version of the site: a new version never writes into the one in use. */
export function cacheName(version: string): string {
	return `${CACHE_PREFIX}${version}`;
}

/** The caches of older versions, to delete once the new version has taken over. */
export function staleCaches(names: readonly string[], current: string): string[] {
	return names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== current);
}

export interface SiteFiles {
	/** Files made by Vite (scripts, styles, fonts). */
	readonly build: readonly string[];
	/** Files of `static/` (voices, manifest, icons). */
	readonly files: readonly string[];
	/** Pages made at build time. */
	readonly prerendered: readonly string[];
	/** Base path of the deployment: `''`, or `/name` on GitHub Pages. */
	readonly base: string;
}

/**
 * What the first visit keeps for later: the whole game, once each, home page included. Only paths of
 * the site itself, so that nothing from another origin is ever stored.
 *
 * `required`: pages, scripts and styles, without which the game cannot start; the version is not
 * installed if one is missing. `optional`: the files of `static/` (voices, icons): one that is not
 * served is skipped rather than costing the whole game its offline copy.
 */
export function precacheUrls({ build, files, prerendered, base }: SiteFiles) {
	const ownPaths = (urls: readonly string[]) =>
		urls.filter((url) => url.startsWith('/') && !url.startsWith('//'));
	const required = [...new Set(ownPaths([`${base}/`, ...prerendered, ...build]))];
	const optional = [...new Set(ownPaths(files))].filter((url) => !required.includes(url));
	return { required, optional };
}

/**
 * The cache keys that may hold a page: the address as asked, then with a trailing slash added or
 * removed (a static host answers both with the same page).
 */
export function pageCandidates(pathname: string): string[] {
	const withoutSlash = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	const withSlash = withoutSlash.endsWith('/') ? withoutSlash : `${withoutSlash}/`;
	return [...new Set([pathname, withoutSlash, withSlash])];
}

/**
 * Last resort for a page that was never visited: the home page, so that a link followed offline
 * lands in the game instead of an error.
 */
export function homeCandidates(base: string): string[] {
	return [`${base}/`, base].filter((candidate) => candidate !== '');
}
