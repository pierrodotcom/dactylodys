import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

/*
 * A built site served as a static host such as GitHub Pages serves the published one: files only,
 * read at each request, nothing compressed nor rendered on the fly (audit Q-13). `vite preview`
 * took half a minute to start on a busy machine and compressed every file of every page.
 */

/**
 * The type a static host gives each kind of file of the site.
 *
 * @type {Record<string, string>}
 */
export const CONTENT_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.mp3': 'audio/mpeg',
	'.md': 'text/markdown; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8'
};

/**
 * The file a static host answers an address with: `/jouer` is `jouer.html`, `/` is `index.html`;
 * nothing outside the folder of the site.
 *
 * @param {string} root the folder of the site
 * @param {string} pathname the path of the address, as the browser asks for it
 * @returns {{ file: string; size: number } | undefined}
 */
export function fileFor(root, pathname) {
	const site = resolve(root);
	let decoded;
	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return undefined;
	}
	const path = join(site, normalize(decoded));
	if (path !== site && !path.startsWith(site + sep)) return undefined;
	for (const candidate of [path, `${path}.html`, join(path, 'index.html')]) {
		try {
			const stat = statSync(candidate);
			if (stat.isFile()) return { file: candidate, size: stat.size };
		} catch {
			// Not this one: the next way of writing the address.
		}
	}
	return undefined;
}

/**
 * A server of the folder of a built site, as a static host serves it.
 *
 * @param {string} root
 */
export function createStaticSiteServer(root) {
	return createServer((request, response) => {
		const found = fileFor(root, new URL(request.url ?? '/', 'http://site').pathname);
		if (!found) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'Content-Type': CONTENT_TYPES[extname(found.file)] ?? 'application/octet-stream',
			'Content-Length': found.size
		});
		if (request.method === 'HEAD') {
			response.end();
			return;
		}
		createReadStream(found.file)
			.on('error', () => response.destroy())
			.pipe(response);
	});
}
