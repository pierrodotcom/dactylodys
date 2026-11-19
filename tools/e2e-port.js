// Prints a port the server of the e2e tests can listen on, on every address it is given: the
// preferred one when it can be bound on all, otherwise one handed out by the system. Windows
// reserves ranges of ports (`netsh int ipv4 show excludedportrange protocol=tcp`) where the
// preferred port may fall with EACCES (L-091, L-093); a port handed out by the system is never in a
// reserved range.
// Run as a child process because binding is asynchronous and the Playwright config is not.
//   node tools/e2e-port.js <host>[,<host>...] <preferred-port>
import { createServer } from 'node:net';
import { E2E_HOSTS } from './lib/e2e-site.js';

/**
 * @param {string} host
 * @param {number} port
 * @returns {Promise<import('node:net').Server | null>} the listening server, or null
 */
function listen(host, port) {
	return new Promise((resolve) => {
		const server = createServer();
		server.once('error', () => resolve(null));
		server.listen({ host, port, exclusive: true }, () => resolve(server));
	});
}

/**
 * Binds one port on every host, chosen by the first one when it is 0, then lets it go.
 *
 * @param {string[]} hosts
 * @param {number} port
 * @returns {Promise<number | null>} the port bound on every host, or null
 */
async function tryListenAll(hosts, port) {
	const servers = [];
	let chosen = port;
	for (const host of hosts) {
		const server = await listen(host, chosen);
		if (server === null) break;
		servers.push(server);
		const address = server.address();
		if (typeof address === 'object' && address) chosen = address.port;
	}
	await Promise.all(servers.map((server) => new Promise((done) => server.close(done))));
	return servers.length === hosts.length ? chosen : null;
}

const [hostList = E2E_HOSTS.join(','), preferred = '0'] = process.argv.slice(2);
const hosts = hostList.split(',');
let port = await tryListenAll(hosts, Number(preferred));
// The port the system hands out on the first host may be taken on another one: ask again.
for (let attempt = 0; port === null && attempt < 10; attempt++) port = await tryListenAll(hosts, 0);
if (port === null) {
	console.error(`No port can be bound on ${hosts.join(' and ')}`);
	process.exit(1);
}
console.log(port);
