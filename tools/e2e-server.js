import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_SITE_DIRECTORY } from './lib/dev-pages.js';
import { createStaticSiteServer } from './lib/static-site.js';

/*
 * Serves the site of the end-to-end tests (`npm run build:e2e`) as GitHub Pages serves the published
 * one, on the port Playwright gives; stops at once when the port cannot be bound, so that Playwright
 * says so instead of waiting for the site of another copy.
 *   node tools/e2e-server.js <host> <port>
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const [host = '127.0.0.1', port = '0'] = process.argv.slice(2);

const server = createStaticSiteServer(join(root, E2E_SITE_DIRECTORY));
server.on('error', (error) => {
	console.error(error.message);
	process.exit(1);
});
server.listen({ host, port: Number(port), exclusive: true }, () => {
	console.log(`site of the end-to-end tests on http://${host}:${port}`);
});
