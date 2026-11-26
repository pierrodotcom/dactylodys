// Applies the French typography of the interface (ADR-094) to the texts that `content/fr/` shows
// or says: instructions and their short sentences, story, names and descriptions of the rewards.
// What the child types is never touched (`TEXT_FIELDS`). Running it again changes nothing.
//   node tools/content/apply-typography.js
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './lib/common.js';
import { mapStrings, stringsOf, TEXT_FIELDS, typeset } from './lib/typography.js';

const CONTENT = join(REPO_ROOT, 'content', 'fr');

/**
 * The file with its shown texts typeset, written as it was: only the strings that change are
 * replaced in its text, so that its layout stays the one Prettier gave it.
 * @param {string} source
 * @param {readonly string[]} paths
 * @returns {{ text: string, changed: number }}
 */
function typesetFile(source, paths) {
	const data = JSON.parse(source);
	const expected = mapStrings(data, paths, typeset);
	const changes = new Map(
		stringsOf(data)
			.filter(({ path, text }) => paths.includes(path) && typeset(text) !== text)
			.map(({ text }) => [text, typeset(text)])
	);
	let text = source;
	for (const [before, after] of changes) {
		text = text.replaceAll(JSON.stringify(before), JSON.stringify(after));
	}
	// A shown text written again in a typed one would have been changed there too.
	if (!isDeepStrictEqual(JSON.parse(text), expected)) {
		throw new Error('A text to typeset is also typed somewhere: change this file by hand.');
	}
	return { text, changed: changes.size };
}

for (const kind of readdirSync(CONTENT)) {
	const fields = TEXT_FIELDS[kind];
	if (fields === undefined)
		throw new Error(`content/fr/${kind}: no text fields in lib/typography.js`);
	for (const name of readdirSync(join(CONTENT, kind)).filter((file) => file.endsWith('.json'))) {
		const path = join(CONTENT, kind, name);
		const { text, changed } = typesetFile(readFileSync(path, 'utf8'), fields.shown);
		if (changed > 0) writeFileSync(path, text);
		console.log(`${relative(REPO_ROOT, path)}: ${changed} texts typeset`);
	}
}
