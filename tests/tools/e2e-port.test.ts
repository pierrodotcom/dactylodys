import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const HOST = '127.0.0.1';
const SCRIPT = fileURLToPath(new URL('../../tools/e2e-port.js', import.meta.url));

async function pickPort(preferred: number): Promise<number> {
	const { stdout } = await promisify(execFile)(process.execPath, [SCRIPT, HOST, String(preferred)]);
	return Number(stdout.trim());
}

function listen(port: number): Promise<Server> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen({ host: HOST, port, exclusive: true }, () => resolve(server));
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
});
