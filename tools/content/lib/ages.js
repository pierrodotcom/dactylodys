import { join } from 'node:path';
import { DATA_DIR, readTable } from './common.js';

/*
 * Age groups of the words, phrases and texts (ADR-057, proposal 15), read from `data/ages.txt`:
 * `kind | entry | groups`, where `kind` is `mot`, `phrase` or `texte`, `entry` the word, the phrase
 * or the identifier of the text, and `groups` the age groups it is offered to, comma separated
 * (`8-9` or `10-12`). An entry not listed is offered to every group.
 */

export const AGE_BANDS = ['8-9', '10-12'];
const KINDS = { mot: 'words', phrase: 'phrases', texte: 'texts' };

/**
 * @returns {{ words: Map<string, string[]>, phrases: Map<string, string[]>, texts: Map<string, string[]> }}
 */
export function loadAges(path = join(DATA_DIR, 'ages.txt')) {
	const marks = { words: new Map(), phrases: new Map(), texts: new Map() };
	readTable(path).forEach(([kind, entry, groups], index) => {
		const where = `ages.txt row ${index + 1}`;
		const list = KINDS[kind];
		if (list === undefined) throw new Error(`${where}: unknown kind "${kind}"`);
		if (!entry) throw new Error(`${where}: missing entry`);
		const bands = (groups ?? '').split(',').map((band) => band.trim());
		for (const band of bands) {
			if (!AGE_BANDS.includes(band)) throw new Error(`${where}: unknown age group "${band}"`);
		}
		if (bands.length >= AGE_BANDS.length) {
			throw new Error(`${where}: every age group listed, leave the entry out instead`);
		}
		const key = entry.normalize('NFC');
		if (marks[list].has(key)) throw new Error(`${where}: "${key}" listed twice`);
		marks[list].set(
			key,
			AGE_BANDS.filter((band) => bands.includes(band))
		);
	});
	return marks;
}

/**
 * The entries with their age groups from `marks` (any earlier mark is replaced, so that applying
 * twice gives the same), `ages` written last. Throws when a mark names no entry: a typo.
 * @template {Record<string, unknown>} E
 * @param {readonly E[]} entries
 * @param {Map<string, string[]>} marks
 * @param {(entry: E) => string} keyOf
 * @param {string} kind for the message of the error
 * @returns {E[]}
 */
export function withAges(entries, marks, keyOf, kind) {
	const keys = new Set(entries.map(keyOf));
	const unknown = [...marks.keys()].filter((key) => !keys.has(key));
	if (unknown.length > 0) {
		throw new Error(`ages.txt: no such ${kind}: ${unknown.map((key) => `"${key}"`).join(', ')}`);
	}
	return entries.map((entry) => {
		const rest = { ...entry };
		delete rest.ages;
		const ages = marks.get(keyOf(entry));
		return ages === undefined ? rest : { ...rest, ages };
	});
}
