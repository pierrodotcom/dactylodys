// Prints a port the e2e preview server can listen on: the preferred one when it can be bound,
// otherwise one handed out by the system. Windows reserves ranges of ports (`netsh int ipv4 show
// excludedportrange protocol=tcp`) where the preferred port may fall with EACCES (L-091, L-093);
// a port handed out by the system is never in a reserved range.
// Run as a child process because binding is asynchronous and the Playwright config is not.
//   node tools/e2e-port.js <host> <preferred-port>
import { createServer } from 'node:net';

/**
 * @param {string} host
 * @param {number} port
 * @returns {Promise<number | null>} the bound port, or null when it cannot be bound
 */
function tryListen(host, port) {
	return new Promise((resolve) => {
		const server = createServer();
		server.once('error', () => resolve(null));
		server.listen({ host, port, exclusive: true }, () => {
			const address = server.address();
			const bound = typeof address === 'object' && address ? address.port : null;
			server.close(() => resolve(bound));
		});
	});
}

const [host = '127.0.0.1', preferred = '0'] = process.argv.slice(2);
const port = (await tryListen(host, Number(preferred))) ?? (await tryListen(host, 0));
if (port === null) {
	console.error(`No port can be bound on ${host}`);
	process.exit(1);
}
console.log(port);
