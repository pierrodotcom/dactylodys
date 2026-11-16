import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { E2E_HOSTS } from '../../tools/lib/e2e-site.js';

const HOST = '127.0.0.1';
const SCRIPT = fileURLToPath(new URL('../../tools/e2e-port.js', import.meta.url));

async function pickPort(preferred: number, hosts = HOST): Promise<number> {
	const { stdout } = await promisify(execFile)(process.execPath, [
		SCRIPT,
		hosts,
		String(preferred)
	]);
	return Number(stdout.trim());
}

function listen(port: number, host = HOST): Promise<Server> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen({ host, port, exclusive: true }, () => resolve(server));
	});
}

function portOf(server: Server): number {
	const address = server.address();
	if (typeof address !== 'object' || address === null) throw new Error('server is not listening');
	return address.port;
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

describe('e2e port picker', () => {
	const servers: Server[] = [];
	afterEach(async () => {
		await Promise.all(servers.splice(0).map(close));
	});

	it('keeps the preferred port when it can be bound', async () => {
		const probe = await listen(0);
		const free = portOf(probe);
		await close(probe);

		expect(await pickPort(free)).toBe(free);
	});

	// A port Windows reserves fails like a taken one: both refuse to be bound.
	it('falls back to another bindable port when the preferred one cannot be bound', async () => {
		const blocker = await listen(0);
		servers.push(blocker);
		const taken = portOf(blocker);

		const picked = await pickPort(taken);

		expect(picked).not.toBe(taken);
		expect(picked).toBeGreaterThan(0);
		servers.push(await listen(picked));
	});

	// The site of the tests is served on both loopbacks (`tools/lib/e2e-site.js`): a port taken on
	// one of them would let another server answer the browser there.
	it('gives a port free on every loopback, never one taken on one of them', async () => {
		const blocker = await listen(0, '127.0.0.1');
		servers.push(blocker);
		const taken = portOf(blocker);

		const picked = await pickPort(taken, E2E_HOSTS.join(','));

		expect(picked).not.toBe(taken);
		for (const host of E2E_HOSTS) servers.push(await listen(picked, host));
	});
});
