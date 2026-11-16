import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_SITE_DIRECTORY } from './lib/dev-pages.js';
import { E2E_HOSTS, siteOrigin } from './lib/e2e-site.js';
import { createStaticSiteServer } from './lib/static-site.js';

/*
 * Serves the site of the end-to-end tests (`npm run build:e2e`) as GitHub Pages serves the published
 * one, on the port Playwright gives, on each address given; stops at once when the port cannot be
 * bound on one of them, so that Playwright says so instead of waiting for the site of another copy.
 *   node tools/e2e-server.js <host>[,<host>...] <port>
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const [hostList = E2E_HOSTS.join(','), port] = process.argv.slice(2);
if (!port) {
	console.error('Usage: node tools/e2e-server.js <host>[,<host>...] <port>');
	process.exit(1);
}

const site = join(root, E2E_SITE_DIRECTORY);
const hosts = hostList.split(',');
let listening = 0;
for (const host of hosts) {
	const server = createStaticSiteServer(site);
	server.on('error', (error) => {
		console.error(`${host}: ${error.message}`);
		process.exit(1);
	});
	server.listen({ host, port: Number(port), exclusive: true }, () => {
		listening += 1;
		if (listening === hosts.length) {
			console.log(`site of the end-to-end tests on ${hosts.join(' and ')}, at ${siteOrigin(port)}`);
		}
	});
}
