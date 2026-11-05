/** Icons the manifest declares; the files are made by `tools/icons/build-icons.js`. */
export const MANIFEST_ICONS = [
	{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
	{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
	{ src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
];

/**
 * The web manifest, from the French messages (ADR-055: the name is read from `app_name` only) and
 * the resolved light tokens. Every address is relative to the manifest itself, which is served at
 * the root of the site: the base path of the deployment (GitHub Pages serves a sub-path) is
 * therefore followed without being written anywhere.
 *
 * @param {{
 *   messages: Record<string, string>,
 *   tokens: Record<string, string>,
 *   language: string
 * }} input
 */
export function buildWebManifest({ messages, tokens, language }) {
	const name = messages['app_name'];
	const description = messages['app_description'];
	const background = tokens['color-surface-base'];
	if (!name?.trim()) throw new Error('messages: app_name is missing');
	if (!description?.trim()) throw new Error('messages: app_description is missing');
	if (!background) throw new Error('tokens: color-surface-base is missing');
	return {
		id: './',
		name,
		short_name: name,
		description,
		lang: language,
		dir: 'ltr',
		start_url: './',
		scope: './',
		display: 'standalone',
		background_color: background,
		theme_color: background,
		icons: MANIFEST_ICONS
	};
}
