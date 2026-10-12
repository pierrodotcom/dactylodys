import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE_DIR, CONFIG } from './common.js';

export const LEXIQUE_DIR = join(CACHE_DIR, 'lexique');
export const WIKTIONARY_DIR = join(CACHE_DIR, 'wiktionary');

export function wiktionaryCachePath(category) {
	return join(WIKTIONARY_DIR, `${encodeURIComponent(category)}.json`);
}

export function allCategories() {
	const names = new Set();
	for (const theme of CONFIG.themes) theme.categories.forEach((name) => names.add(name));
	for (const group of CONFIG.exclusionGroups) group.categories.forEach((name) => names.add(name));
	return [...names];
}

/** Titles of a cached Wiktionary category, restricted to lowercase single words (no proper nouns). */
export function loadCategory(category) {
	const path = wiktionaryCachePath(category);
	if (!existsSync(path)) throw new Error(`Missing cache for "${category}": run fetch-sources.js`);
	const entry = JSON.parse(readFileSync(path, 'utf8'));
	return { fetchedAt: entry.fetchedAt, titles: entry.titles.filter((t) => t === t.toLowerCase()) };
}

/**
 * Reads the Lexique table and keeps one record per spelling, from the rows whose spelling is
 * their own lemma (nouns, adjectives, adverbs and infinitives).
 */
export function loadLexique() {
	const path = join(LEXIQUE_DIR, CONFIG.sources.lexique.tableName);
	if (!existsSync(path)) throw new Error('Missing Lexique table: run fetch-sources.js');
	const lines = readFileSync(path, 'utf8').split(/\r?\n/);
	const columns = Object.fromEntries(lines[0].split('\t').map((name, i) => [name, i]));
	const allowed = new Set(CONFIG.candidates.partsOfSpeech);
	const words = new Map();
	for (const line of lines.slice(1)) {
		if (line === '') continue;
		const cells = line.split('\t');
		const spelling = cells[columns.ortho].normalize('NFC');
		if (spelling !== cells[columns.lemme].normalize('NFC')) continue;
		const pos = cells[columns.cgram];
		if (!allowed.has(pos)) continue;
		const freq = (Number(cells[columns.freqfilms2]) + Number(cells[columns.freqlivres])) / 2;
		const knownCell = cells[columns.deflem];
		const known = knownCell === '' ? null : Number(knownCell);
		const entry = words.get(spelling) ?? { text: spelling, pos: [], freq: 0, known: null };
		entry.pos.push(pos);
		entry.freq += freq;
		if (known !== null && (entry.known === null || known > entry.known)) entry.known = known;
		words.set(spelling, entry);
	}
	return words;
}
