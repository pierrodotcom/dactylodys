import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CODE_LICENSE, CONTENT_LICENSE, CREDIT_SOURCES, VOICE_AUTHOR } from './sources';

/*
 * The credits page must forget nothing of what `static/ATTRIBUTIONS.md` declares: each row of its
 * table has one entry among the sources of the page, with the same license and the same address.
 */
interface AttributionRow {
	readonly resource: string;
	readonly author: string;
	readonly source: string;
	readonly license: string;
}

const UNESCAPED_PIPE = /(?<!\\)\|/;
const ADDRESS = /https?:\/\/[^\s,)]+/g;

function attributionRows(markdown: string): AttributionRow[] {
	const rows = markdown
		.split(/\r?\n/)
		.filter((line) => line.startsWith('|'))
		.map((line) =>
			line
				.replace(/^\|/, '')
				.replace(/\|\s*$/, '')
				.split(UNESCAPED_PIPE)
				.map((cell) => cell.trim())
		);
	return rows.slice(2).map(([resource = '', author = '', source = '', license = '']) => ({
		resource,
		author,
		source,
		license
	}));
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const attributions = readFileSync('static/ATTRIBUTIONS.md', 'utf8');
const rows = attributionRows(attributions);
const page = readFileSync('src/routes/credits/+page.svelte', 'utf8');
const messages = readJson<Record<string, string>>('messages/fr.json');

describe('the credits page', () => {
	it('reads a table of attributions that declares something', () => {
		expect(rows.length).toBeGreaterThanOrEqual(5);
		for (const row of rows) {
			expect(row.resource, JSON.stringify(row)).not.toBe('');
			expect(row.author, row.resource).not.toBe('');
			expect(row.source, row.resource).not.toBe('');
			expect(row.license, row.resource).not.toBe('');
		}
	});

	it('names every row of the attributions, once', () => {
		for (const row of rows) {
			const entries = CREDIT_SOURCES.filter((source) => row.resource.includes(source.attribution));
			expect(
				entries.map((source) => source.id),
				row.resource
			).toHaveLength(1);
		}
	});

	it('names nothing that the attributions do not declare', () => {
		for (const source of CREDIT_SOURCES) {
			const declared = rows.filter((row) => row.resource.includes(source.attribution));
			expect(declared, source.id).toHaveLength(1);
		}
	});

	it('gives each source the license and the address the attributions give', () => {
		for (const source of CREDIT_SOURCES) {
			const row = rows.find((candidate) => candidate.resource.includes(source.attribution));
			expect(row?.license, source.id).toContain(source.license);
			const addresses = row?.source.match(ADDRESS) ?? [];
			expect(addresses, source.id).toEqual('url' in source ? [source.url] : []);
		}
	});

	it('credits the voice under the name its manifest and the attributions give', () => {
		const row = rows.find((candidate) => candidate.resource.includes('`static/voice/fr/`'));
		expect(row?.author).toBe(VOICE_AUTHOR);
		expect(VOICE_AUTHOR.trim()).not.toBe('');
	});

	it('has a text for every source it lists', () => {
		for (const source of CREDIT_SOURCES) {
			expect(messages[`credits_source_${source.id}`], source.id).toContain('{license}');
			expect(page, source.id).toContain(`m.credits_source_${source.id}`);
			if ('url' in source) {
				expect(messages[`credits_source_${source.id}_link`], source.id).toBeTruthy();
			}
		}
		expect(page).toContain('{#each CREDIT_SOURCES as source');
	});

	it('names every source of the keyboard layouts and of the word bank', () => {
		const files = [
			...readdirSync('layouts')
				.filter((name) => name.endsWith('.json'))
				.map((name) => `layouts/${name}`),
			'content/fr/words/base.json'
		];
		for (const file of files) {
			const { sources } = readJson<{ sources: { url: string; license: string }[] }>(file);
			expect(sources.length, file).toBeGreaterThan(0);
			for (const declared of sources) {
				const entry = CREDIT_SOURCES.find(
					(source) => 'url' in source && source.url === declared.url
				);
				expect(entry?.license, `${file}: ${declared.url}`).toBe(declared.license);
			}
		}
	});
});

describe('the licenses', () => {
	it('are the ones of the repository: code, contents, keyboard layouts', () => {
		expect(readJson<{ license: string }>('package.json').license).toBe(CODE_LICENSE);
		expect(attributions).toContain(CODE_LICENSE);
		expect(attributions).toContain(CONTENT_LICENSE);
		const readme = readFileSync('README.md', 'utf8');
		expect(readme).toContain(CODE_LICENSE);
		expect(readme).toContain(CONTENT_LICENSE);
	});

	it('say everywhere that the keyboard layouts derive from the CLDR, never that they are CC0', () => {
		const derived = /données dérivées du CLDR \(licence Unicode\)/;
		expect(messages['credits_layouts_text']).toMatch(derived);
		expect(attributions).toMatch(derived);
		const readme = readFileSync('README.md', 'utf8');
		expect(readme).toMatch(derived);
		for (const text of [readme, attributions, ...Object.values(messages)]) {
			expect(text).not.toMatch(/CC0/);
		}
	});
});
