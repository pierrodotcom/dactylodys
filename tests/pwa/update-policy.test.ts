import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A new version must never reach a game in progress (ADR-054): these checks keep the pieces that
// guarantee it from being added by accident.
const worker = readFileSync('src/service-worker.ts', 'utf8').replace(
	/\/\*[\s\S]*?\*\/|\/\/.*$/gm,
	''
);

describe('the service worker', () => {
	it('never skips the waiting of a new version', () => {
		expect(worker).not.toMatch(/skipWaiting/);
	});

	it('takes a page over only when it is the first worker of the site', () => {
		const claims = worker.match(/clients\.claim\(\)/g) ?? [];
		expect(claims).toHaveLength(1);
		expect(worker).toMatch(/if \(FIRST_INSTALL\) await sw\.clients\.claim\(\)/);
	});

	it('does not message the pages', () => {
		expect(worker).not.toMatch(/postMessage|clients\.matchAll|\.navigate\(/);
	});

	it('keeps each version in its own cache and removes the old ones only when it activates', () => {
		const install = worker.slice(worker.indexOf("'install'"), worker.indexOf("'activate'"));
		expect(install).not.toMatch(/caches\.delete/);
		expect(worker).toMatch(/staleCaches\(await caches\.keys\(\), CACHE\)/);
	});
});

describe('the pages', () => {
	const sources = [
		'src/routes/+layout.svelte',
		'src/routes/jouer/+page.svelte',
		'src/lib/offline/install-prompt.ts'
	].map((file) => readFileSync(file, 'utf8'));

	it('never reload by themselves, nor announce a new version', () => {
		for (const source of sources) {
			expect(source).not.toMatch(/location\.reload|\bupdated\b|controllerchange|skipWaiting/);
		}
	});

	it('do not ask SvelteKit to look for new versions while someone plays', () => {
		expect(readFileSync('svelte.config.js', 'utf8')).not.toMatch(/pollInterval/);
	});
});
