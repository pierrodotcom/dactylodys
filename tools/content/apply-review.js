// Applies a human review to ONE bank: its rejected entries are removed, its other entries become
// `review: "human"`. The other bank is left untouched.
//   node tools/content/apply-review.js words --no "mot" --no "autre mot"
//   node tools/content/apply-review.js phrases --no "une phrase refusée"
// The decisions are written to tools/content/data/ so that rebuilding the banks gives the same result.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, REPO_ROOT, writeBankJson, writeText } from './lib/common.js';

const WORDS = join(REPO_ROOT, 'content', 'fr', 'words', 'base.json');
const PHRASES = join(REPO_ROOT, 'content', 'fr', 'phrases', 'base.json');
const EXCLUSIONS = join(DATA_DIR, 'exclusions.txt');
const PHRASE_SOURCE = join(DATA_DIR, 'phrases.fr.txt');
const REASON = 'relecture-humaine';

const USAGE = 'usage: apply-review.js <words|phrases> [--no "<text>" ...]';
const reviewed = process.argv[2];
if (reviewed !== 'words' && reviewed !== 'phrases') throw new Error(USAGE);

const rejected = [];
for (let i = 3; i < process.argv.length; i += 2) {
	if (process.argv[i] !== '--no' || process.argv[i + 1] === undefined) throw new Error(USAGE);
	rejected.push(process.argv[i + 1].normalize('NFC').trim());
}

const wordBank = JSON.parse(readFileSync(WORDS, 'utf8'));
const phraseBank = JSON.parse(readFileSync(PHRASES, 'utf8'));
const wordTexts = new Set(wordBank.words.map((word) => word.text));
const phraseTexts = new Set(phraseBank.phrases.map((phrase) => phrase.text));

const reviewedTexts = reviewed === 'words' ? wordTexts : phraseTexts;
const unknown = rejected.filter((text) => !reviewedTexts.has(text));
if (unknown.length > 0) {
	throw new Error(`not in the ${reviewed} bank: ${unknown.map((text) => `"${text}"`).join(', ')}`);
}
const rejectedWords = reviewed === 'words' ? rejected : [];
const rejectedPhrases = reviewed === 'phrases' ? rejected : [];

const validate = (entries, refused) =>
	entries
		.filter((entry) => !refused.includes(entry.text))
		.map((entry) => ({ ...entry, review: 'human' }));
if (reviewed === 'words') wordBank.words = validate(wordBank.words, rejectedWords);
else phraseBank.phrases = validate(phraseBank.phrases, rejectedPhrases);

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
if (reviewed === 'words') {
	writeText(join(DATA_DIR, 'validated-words.txt'), list(wordBank.words));
	writeBankJson(WORDS, wordBank, 'words');
} else {
	writeText(join(DATA_DIR, 'validated-phrases.txt'), list(phraseBank.phrases));
	writeBankJson(PHRASES, phraseBank, 'phrases');
}

const count = reviewed === 'words' ? wordBank.words.length : phraseBank.phrases.length;
console.log(`${reviewed}: removed ${rejected.length}, validated ${count}`);
