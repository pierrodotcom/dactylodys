import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildWebManifest, MANIFEST_ICONS } from '../../tools/lib/web-manifest.js';

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const tokens = { 'color-surface-base': '#fbf5e9' };
const manifest = buildWebManifest({ messages, tokens, language: 'fr' });

describe('the web manifest', () => {
	it('takes its names from app_name, so that a new name needs no other change', () => {
		expect(manifest.name).toBe(messages['app_name']);
		expect(manifest.short_name).toBe(messages['app_name']);

		const renamed = buildWebManifest({
			messages: { ...messages, app_name: 'Autre nom' },
			tokens,
			language: 'fr'
		});
		expect(renamed.name).toBe('Autre nom');
		expect(renamed.short_name).toBe('Autre nom');
	});

	it('takes its colours from the tokens', () => {
		expect(manifest.background_color).toBe(tokens['color-surface-base']);
		expect(manifest.theme_color).toBe(tokens['color-surface-base']);
	});

	it('opens as an app, in the language of the messages', () => {
		expect(manifest.display).toBe('standalone');
		expect(manifest.lang).toBe('fr');
	});

	it.each(['', '/DactyloDys', '/some/deep/base'])(
		'stays inside the site whatever its base path (%j)',
		(base) => {
			const manifestUrl = new URL(`${base}/manifest.webmanifest`, 'https://example.org');
			const start = new URL(manifest.start_url, manifestUrl);
			const scope = new URL(manifest.scope, manifestUrl);

			expect(start.pathname).toBe(`${base}/`);
			expect(scope.pathname).toBe(`${base}/`);
			for (const icon of manifest.icons) {
				expect(new URL(icon.src, manifestUrl).pathname.startsWith(`${base}/icons/`)).toBe(true);
			}
		}
	);

	it('declares icons of 192 and 512 pixels and a maskable one, all present in static/', () => {
		const purposes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
		expect(purposes).toEqual(['192x192:any', '512x512:any', '512x512:maskable']);
		for (const icon of MANIFEST_ICONS) expect(existsSync(`static/${icon.src}`)).toBe(true);
		expect(existsSync('static/icons/apple-touch-icon.png')).toBe(true);
	});

	it('refuses to be built without a name or a background colour', () => {
		expect(() => buildWebManifest({ messages: {}, tokens, language: 'fr' })).toThrow(/app_name/);
		expect(() => buildWebManifest({ messages, tokens: {}, language: 'fr' })).toThrow(/color/);
	});
});

describe('the PNG icons', () => {
	const SIZES: Readonly<Record<string, number>> = {
		'icon-192.png': 192,
		'icon-512.png': 512,
		'icon-maskable-512.png': 512,
		'apple-touch-icon.png': 180
	};

	it.each(Object.entries(SIZES))('%s is a square PNG of %i pixels', (file, size) => {
		const bytes = readFileSync(`static/icons/${file}`);
		expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
		expect(bytes.readUInt32BE(16)).toBe(size);
		expect(bytes.readUInt32BE(20)).toBe(size);
	});
});
