import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStaticSiteServer, fileFor } from '../../tools/lib/static-site.js';

describe('a built site served as a static host serves it', () => {
	let site = '';
	let server: Server;
	let origin = '';

	beforeAll(async () => {
		site = mkdtempSync(join(tmpdir(), 'dactylodys-site-'));
		mkdirSync(join(site, 'dev'));
		mkdirSync(join(site, '_app'));
		writeFileSync(join(site, 'index.html'), '<h1>home</h1>');
		writeFileSync(join(site, 'jouer.html'), '<h1>play</h1>');
		writeFileSync(join(site, 'dev', 'jeux.html'), '<h1>games</h1>');
		writeFileSync(join(site, '_app', 'start.js'), 'export {};');
		writeFileSync(join(site, 'secret.txt'), 'inside');
		server = createStaticSiteServer(site);
		await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
		origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise((done) => server.close(done));
		rmSync(site, { recursive: true, force: true });
	});

	it('answers an address with its page, as GitHub Pages does', () => {
		expect(fileFor(site, '/')?.file).toBe(join(site, 'index.html'));
		expect(fileFor(site, '/jouer')?.file).toBe(join(site, 'jouer.html'));
		expect(fileFor(site, '/dev/jeux')?.file).toBe(join(site, 'dev', 'jeux.html'));
		expect(fileFor(site, '/_app/start.js')?.file).toBe(join(site, '_app', 'start.js'));
	});

	it('answers nothing outside the folder of the site, nor what it does not hold', () => {
		const inner = join(site, 'dev');
		expect(fileFor(inner, '/jeux')?.file).toBe(join(inner, 'jeux.html'));
		expect(fileFor(inner, '/../secret.txt')).toBeUndefined();
		expect(fileFor(inner, '/%2e%2e/secret.txt')).toBeUndefined();
		expect(fileFor(site, '/adulte')).toBeUndefined();
		expect(fileFor(site, '/%E0%A4%A')).toBeUndefined();
	});

	it('serves each file whole, with its type and uncompressed, and 404 for the others', async () => {
		const page = await fetch(`${origin}/jouer`, { headers: { 'accept-encoding': 'gzip' } });
		expect(page.status).toBe(200);
		expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(page.headers.get('content-encoding')).toBeNull();
		expect(await page.text()).toBe('<h1>play</h1>');

		const script = await fetch(`${origin}/_app/start.js`);
		expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
		expect(await script.text()).toBe('export {};');

		expect((await fetch(`${origin}/adulte`)).status).toBe(404);
	});
});
