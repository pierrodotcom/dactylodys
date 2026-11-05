import { describe, expect, it } from 'vitest';
import {
	CACHE_PREFIX,
	cacheName,
	homeCandidates,
	pageCandidates,
	precacheUrls,
	staleCaches
} from './cache-plan';

describe('cache names', () => {
	it('gives each version of the site its own cache', () => {
		expect(cacheName('1')).not.toBe(cacheName('2'));
		expect(cacheName('abc').startsWith(CACHE_PREFIX)).toBe(true);
	});

	it('deletes the caches of older versions and nothing else', () => {
		const current = cacheName('2');
		const names = [cacheName('1'), current, cacheName('0'), 'another-app-cache', 'workbox-1'];
		expect(staleCaches(names, current)).toEqual([cacheName('1'), cacheName('0')]);
	});

	it('keeps the current cache when it is the only one', () => {
		expect(staleCaches([cacheName('7')], cacheName('7'))).toEqual([]);
	});
});

describe('precacheUrls', () => {
	const site = {
		build: ['/base/_app/immutable/entry/start.js', '/base/_app/immutable/assets/font.woff2'],
		files: ['/base/voice/fr/manifest.json', '/base/voice/fr/a.mp3', '/base/manifest.webmanifest'],
		prerendered: ['/base/', '/base/jouer', '/base/adulte', '/base/dev/ui'],
		base: '/base'
	};

	it('lists every page, script, style, font, voice and the manifest once', () => {
		const { required, optional } = precacheUrls(site);
		const urls = [...required, ...optional];
		for (const url of [...site.build, ...site.files, ...site.prerendered]) {
			expect(urls).toContain(url);
		}
		expect(new Set(urls).size).toBe(urls.length);
	});

	it('requires the pages and the code, and only prefers the files of static', () => {
		const { required, optional } = precacheUrls(site);
		expect(required).toEqual(expect.arrayContaining([...site.prerendered, ...site.build]));
		expect(optional).toEqual(site.files);
	});

	it('always keeps the home page, even when nothing was prerendered for it', () => {
		expect(precacheUrls({ ...site, prerendered: [] }).required).toContain('/base/');
		expect(precacheUrls({ ...site, base: '', prerendered: [] }).required).toContain('/');
	});

	it('never keeps an address of another origin', () => {
		const { required, optional } = precacheUrls({
			...site,
			build: [...site.build, 'https://example.org/z.js'],
			files: [...site.files, 'https://example.org/x.js', '//example.org/y.js']
		});
		const urls = [...required, ...optional];
		expect(urls.filter((url) => !url.startsWith('/') || url.startsWith('//'))).toEqual([]);
	});
});

describe('page candidates', () => {
	it('tries the address as asked, then with and without a trailing slash', () => {
		expect(pageCandidates('/base/jouer')).toEqual(['/base/jouer', '/base/jouer/']);
		expect(pageCandidates('/base/jouer/')).toEqual(['/base/jouer/', '/base/jouer']);
	});

	it('does not turn the root into an empty address', () => {
		expect(pageCandidates('/')).toEqual(['/']);
	});

	it('falls back to the home page, with or without a base path', () => {
		expect(homeCandidates('/base')).toEqual(['/base/', '/base']);
		expect(homeCandidates('')).toEqual(['/']);
	});
});
