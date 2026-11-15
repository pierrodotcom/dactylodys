import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	ALL_DEV_PAGES,
	PUBLISHED_DEV_PAGES,
	isInternalDevPageFile,
	isInternalDevRoute
} from '../../tools/lib/dev-pages.js';

// The published site keeps `/dev/traces` and `/dev/voix` only (ADR-075).
const DEV_ROUTES = 'src/routes/dev';
const devPages = readdirSync(DEV_ROUTES, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

describe('the trial pages of /dev', () => {
	it('publishes the page for keyboard testers and the voice page, and no other', () => {
		expect(PUBLISHED_DEV_PAGES).toEqual(['traces', 'voix']);
		for (const name of PUBLISHED_DEV_PAGES) {
			expect(existsSync(`${DEV_ROUTES}/${name}/+page.svelte`), name).toBe(true);
			expect(isInternalDevRoute(`/dev/${name}`), name).toBe(false);
		}
	});

	it('leaves every other trial page out of the published site', () => {
		const internal = devPages.filter((name) => !PUBLISHED_DEV_PAGES.includes(name));
		expect(internal.length).toBeGreaterThan(0);
		for (const name of internal) {
			expect(isInternalDevRoute(`/dev/${name}`), name).toBe(true);
			expect(isInternalDevRoute(`/dev/${name}/`), name).toBe(true);
			expect(isInternalDevPageFile(`C:\\site\\src\\routes\\dev\\${name}\\+page.svelte`)).toBe(true);
			expect(isInternalDevPageFile(`/site/src/routes/dev/${name}/+page.ts`), name).toBe(true);
		}
	});

	it('never takes a page of the game for a trial page', () => {
		for (const route of ['/', '/jouer', '/adulte', '/credits', '/devoirs/ui', '/jouer/dev/ui']) {
			expect(isInternalDevRoute(route), route).toBe(false);
		}
		for (const file of [
			'/home/dev/site/src/routes/jouer/+page.svelte',
			'/site/src/routes/dev/traces/+page.svelte',
			'/site/src/routes/dev/ui/FingerLegend.svelte',
			'/site/src/routes/dev/ui/+page.svelte?svelte&type=style&lang.css',
			'/site/src/routes/dev/+layout.ts'
		]) {
			expect(isInternalDevPageFile(file), file).toBe(false);
		}
	});

	it('opens them all only where the build variable is set, under the name the page reads', () => {
		const layout = readFileSync(`${DEV_ROUTES}/+layout.ts`, 'utf8');
		expect(layout).toContain(
			`import.meta.env.${ALL_DEV_PAGES.variable} === '${ALL_DEV_PAGES.value}'`
		);
		const scripts = (
			JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
		).scripts;
		expect(scripts['build']).toBe('vite build');
		expect(scripts['test:e2e']).toContain('build:e2e');
	});
});
