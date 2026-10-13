// Applies a human review to the banks: the rejected entries are removed, everything else becomes
// `review: "human"`.
//   node tools/content/apply-review.js --no "mot" --no "une phrase refusée" ...
// The decisions are written to tools/content/data/ so that rebuilding the banks gives the same result.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, REPO_ROOT, writeBankJson, writeText } from './lib/common.js';

const WORDS = join(REPO_ROOT, 'content', 'fr', 'words', 'base.json');
const PHRASES = join(REPO_ROOT, 'content', 'fr', 'phrases', 'base.json');
const EXCLUSIONS = join(DATA_DIR, 'exclusions.txt');
const PHRASE_SOURCE = join(DATA_DIR, 'phrases.fr.txt');
const REASON = 'relecture-humaine';

const rejected = [];
for (let i = 2; i < process.argv.length; i += 2) {
	if (process.argv[i] !== '--no' || process.argv[i + 1] === undefined) {
		throw new Error('usage: apply-review.js --no "<text>" [--no "<text>" ...]');
	}
	rejected.push(process.argv[i + 1].normalize('NFC').trim());
}

const wordBank = JSON.parse(readFileSync(WORDS, 'utf8'));
const phraseBank = JSON.parse(readFileSync(PHRASES, 'utf8'));
const wordTexts = new Set(wordBank.words.map((word) => word.text));
const phraseTexts = new Set(phraseBank.phrases.map((phrase) => phrase.text));

const unknown = rejected.filter((text) => !wordTexts.has(text) && !phraseTexts.has(text));
if (unknown.length > 0) {
	throw new Error(`not in the banks: ${unknown.map((text) => `"${text}"`).join(', ')}`);
}
const rejectedWords = rejected.filter((text) => wordTexts.has(text));
const rejectedPhrases = rejected.filter((text) => phraseTexts.has(text));

const validate = (entries, refused) =>
	entries
		.filter((entry) => !refused.includes(entry.text))
		.map((entry) => ({ ...entry, review: 'human' }));
wordBank.words = validate(wordBank.words, rejectedWords);
phraseBank.phrases = validate(phraseBank.phrases, rejectedPhrases);

if (rejectedWords.length > 0) {
	const lines = rejectedWords.map((text) => `${text} | ${REASON}`).join('\n');
	writeText(EXCLUSIONS, `${readFileSync(EXCLUSIONS, 'utf8').trimEnd()}\n${lines}\n`);
}
if (rejectedPhrases.length > 0) {
	const kept = readFileSync(PHRASE_SOURCE, 'utf8')
		.split(/\r?\n/)
		.filter((line) => !rejectedPhrases.includes(line.split('|').at(-1).trim().normalize('NFC')));
	writeText(PHRASE_SOURCE, kept.join('\n'));
}

const list = (entries) => `${entries.map((entry) => entry.text).join('\n')}\n`;
writeText(join(DATA_DIR, 'validated-words.txt'), list(wordBank.words));
writeText(join(DATA_DIR, 'validated-phrases.txt'), list(phraseBank.phrases));
writeBankJson(WORDS, wordBank, 'words');
writeBankJson(PHRASES, phraseBank, 'phrases');

console.log(
	`removed ${rejectedWords.length} word(s) and ${rejectedPhrases.length} phrase(s); ` +
		`validated ${wordBank.words.length} words and ${phraseBank.phrases.length} phrases`
);
