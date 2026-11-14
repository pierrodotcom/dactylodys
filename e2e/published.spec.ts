import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import { PUBLISHED_DEV_PAGES } from '../tools/lib/dev-pages.js';

/*
 * The other tests run on the site built with every trial page (`npm run build:e2e`). These look at
 * the site that is really published, `build/`, as `npm run build` writes it (ADR-075): it keeps
 * `/dev/traces` and `/dev/voix` only, and nothing of the others.
 */
const SITE = resolve('build');
const HOST = '127.0.0.1';
const TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.woff2': 'font/woff2',
	'.mp3': 'audio/mpeg',
	'.md': 'text/markdown; charset=utf-8'
};
const INTERNAL_DEV_PAGES = readdirSync('src/routes/dev', { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !PUBLISHED_DEV_PAGES.includes(entry.name))
	.map((entry) => entry.name);

/** The file a static host such as GitHub Pages answers with: `/jouer` is `jouer.html`. */
function fileFor(pathname: string): string | undefined {
	const path = join(SITE, normalize(decodeURIComponent(pathname)));
	if (path !== SITE && !path.startsWith(SITE + sep)) return undefined;
	const candidates = [path, `${path}.html`, join(path, 'index.html')];
	return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function filesUnder(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)]
	);
}

let server: Server;
let origin = '';

test.beforeAll(async () => {
	expect(existsSync(join(SITE, 'index.html')), 'run `npm run build` before these tests').toBe(true);
	server = createServer((request, response) => {
		const file = fileFor(new URL(request.url ?? '/', `http://${HOST}`).pathname);
		if (!file) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream'
		});
		response.end(readFileSync(file));
	});
	await new Promise<void>((done) => server.listen(0, HOST, done));
	origin = `http://${HOST}:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
	await new Promise((done) => server.close(done));
});

test('serves the game and the two trial pages asked of testers', async ({ page }) => {
	for (const path of [
		'/',
		'/jouer',
		'/credits',
		...PUBLISHED_DEV_PAGES.map((name) => `/dev/${name}`)
	]) {
		const response = await page.goto(origin + path);
		expect(response?.status(), path).toBe(200);
		await expect(page.locator('h1').first(), path).toBeVisible();
	}
});

test('no longer serves the internal trial pages', async ({ page }) => {
	expect(INTERNAL_DEV_PAGES).toContain('compagnon');
	for (const name of INTERNAL_DEV_PAGES) {
		const response = await page.goto(`${origin}/dev/${name}`);
		expect(response?.status(), name).toBe(404);
	}
	const published = readdirSync(join(SITE, 'dev')).sort();
	expect(published).toEqual(PUBLISHED_DEV_PAGES.map((name) => `${name}.html`).sort());
});

test.describe('with its service worker', () => {
	test.use({ serviceWorkers: 'allow' });

	test('keeps the game for playing offline, and no trial page', async ({ page }) => {
		// The worker downloads the whole game before it is ready: long on a busy machine.
		test.slow();
		await page.goto(`${origin}/`);
		await page.evaluate(() => navigator.serviceWorker.ready);
		await expect
			.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
			.toBe(true);
		const kept = await page.evaluate(async () => {
			const paths: string[] = [];
			for (const name of await caches.keys()) {
				for (const request of await (await caches.open(name)).keys()) {
					paths.push(new URL(request.url).pathname);
				}
			}
			return paths;
		});
		expect(kept).toEqual(expect.arrayContaining(['/', '/jouer', '/adulte', '/credits']));
		expect(kept.filter((path) => path.startsWith('/dev'))).toEqual([]);
	});
});

test('carries nothing of the internal trial pages in its code', () => {
	// What only an internal trial page shows: the title of its screen, in no file of the site.
	const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
	const marks = [messages['dev_companion_title'], messages['dev_ghost_title']];
	const code = filesUnder(join(SITE, '_app')).filter((file) => /\.(js|css)$/.test(file));
	expect(code.length).toBeGreaterThan(10);
	for (const mark of marks) {
		expect(mark).toBeTruthy();
		const found = code.filter((file) => readFileSync(file, 'utf8').includes(mark ?? ''));
		expect(found, mark).toEqual([]);
	}
});
