import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { E2E_SITE_DIRECTORY } from './dev-pages.js';

/*
 * The site the end-to-end tests of a copy of the repository run on (L-149): two suites started a few
 * seconds apart from two copies once served two sites on the same port, and tests got the site of
 * the other copy. Each copy now asks for its own port, and its built site serves a mark that the
 * other copies' sites do not: Playwright waits for the mark of its copy before the first test.
 */

/** The ports the copies ask for: away from those of the tools (4273, 5273) and of the system. */
export const PORT_RANGE = { first: 20_000, size: 10_000 };

/** The folder of the site of the tests, which `tools/e2e-server.js` serves. */
export const SITE_OUTPUT = E2E_SITE_DIRECTORY;

/**
 * The same text for the same copy, however its path is written: Windows ignores the case of a path
 * and takes both kinds of slash.
 *
 * @param {string} root
 * @param {NodeJS.Platform} platform
 */
export function copyIdentity(root, platform = process.platform) {
	const path = resolve(root).replaceAll('\\', '/');
	return platform === 'win32' ? path.toLowerCase() : path;
}

/**
 * @param {string} root
 * @param {NodeJS.Platform} platform
 */
function digest(root, platform) {
	return createHash('sha256').update(copyIdentity(root, platform)).digest('hex');
}

/**
 * The mark of a copy: the same at every run in that copy, another one in any other copy.
 *
 * @param {string} root
 * @param {NodeJS.Platform} [platform]
 */
export function siteMark(root, platform = process.platform) {
	return digest(root, platform).slice(0, 16);
}

/**
 * The file of the mark, at the root of the site.
 *
 * @param {string} mark
 */
export function markFileName(mark) {
	return `e2e-site-${mark}.txt`;
}

/**
 * The port a copy asks for first: two copies almost never ask for the same one. `tools/e2e-port.js`
 * takes another one when it cannot be bound.
 *
 * @param {string} root
 * @param {NodeJS.Platform} [platform]
 */
export function preferredPort(root, platform = process.platform) {
	const share = Number.parseInt(digest(root, platform).slice(0, 8), 16);
	return PORT_RANGE.first + (share % PORT_RANGE.size);
}

/**
 * Writes the mark of the copy into its built site, after the build: each build of that site starts
 * by emptying its folder, and the published site is written elsewhere (`build/`), so the mark never
 * reaches it. Gives the path of the file.
 *
 * @param {string} root
 */
export function writeSiteMark(root) {
	const directory = join(root, SITE_OUTPUT);
	mkdirSync(directory, { recursive: true });
	const mark = siteMark(root);
	const file = join(directory, markFileName(mark));
	writeFileSync(file, `${mark}\n`);
	return file;
}
