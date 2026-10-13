import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG, REPO_ROOT, STEP_INDEX, tierOf, unknownChars } from './lib/common.js';

const WORLD_THEMES = ['dinos', 'cuisine', 'animaux', 'espace', 'vehicules'];
const MIN_WORDS = 600;
const MIN_WORDS_PER_WORLD_THEME = 40;
const MIN_EARLY_WORDS = 25;
const MIN_PHRASES_PER_EARLY_TIER = 10;
const MIN_PHRASES_ACCENT_TIER = 15;
const MIN_PHRASES_FULL_ALPHABET = 15;
const MIN_PHRASES_CAPITALS = 30;
const MIN_PHRASES_CIRCUMFLEX = 10;
const PHRASE_WORDS = [3, 8];

const errors = [];
const fail = (message) => errors.push(message);
const readJson = (relative) => JSON.parse(readFileSync(join(REPO_ROOT, relative), 'utf8'));
const step = (id) => STEP_INDEX[id];

function checkBankHead(bank, id) {
	if (bank.schemaVersion !== 1) fail(`${id}: schemaVersion must be 1`);
	if (bank.id !== id) fail(`${id}: unexpected id ${bank.id}`);
	if (bank.locale !== CONFIG.output.locale) fail(`${id}: unexpected locale ${bank.locale}`);
}

function checkWords() {
	const bank = readJson(CONFIG.output.wordsFile);
	checkBankHead(bank, CONFIG.output.wordBankId);
	if (!bank.sources?.length) fail('words: no sources');
	for (const source of bank.sources ?? []) {
		if (!source.name || !source.url || !source.license)
			fail(`words: incomplete source ${source.name}`);
	}
	const themeIds = new Set(bank.themes.map((theme) => theme.id));
	if (themeIds.size !== bank.themes.length) fail('words: duplicate theme id');
	for (const theme of bank.themes) if (!theme.title) fail(`words: theme ${theme.id} has no title`);

	const seen = new Set();
	const perTheme = {};
	const perLevel = { 1: 0, 2: 0, 3: 0 };
	let early = 0;
	for (const word of bank.words) {
		const { text } = word;
		if (text !== text.normalize('NFC') || text !== text.toLowerCase())
			fail(`word "${text}": not lowercase NFC`);
		if (seen.has(text)) fail(`word "${text}": duplicate`);
		seen.add(text);
		if (!/^[\p{L}]+$/u.test(text)) fail(`word "${text}": must be letters only`);
		const bad = unknownChars(text);
		if (bad.length > 0)
			fail(`word "${text}": characters outside the learning order: ${bad.join(' ')}`);
		if (![1, 2, 3].includes(word.level)) fail(`word "${text}": bad level ${word.level}`);
		if (word.review !== 'agent' && word.review !== 'human') fail(`word "${text}": bad review`);
		if (word.themes.length === 0) fail(`word "${text}": no theme`);
		for (const id of word.themes) {
			if (!themeIds.has(id)) fail(`word "${text}": undeclared theme ${id}`);
			perTheme[id] = (perTheme[id] ?? 0) + 1;
		}
		perLevel[word.level]++;
		if (tierOf(text) <= step('a-o')) early++;
	}
	for (const id of themeIds) if (!perTheme[id]) fail(`words: theme ${id} is declared but unused`);

	if (bank.words.length < MIN_WORDS) fail(`words: ${bank.words.length} < ${MIN_WORDS}`);
	for (const id of WORLD_THEMES) {
		if ((perTheme[id] ?? 0) < MIN_WORDS_PER_WORLD_THEME)
			fail(`words: theme ${id} has ${perTheme[id] ?? 0} words`);
	}
	if (early < MIN_EARLY_WORDS)
		fail(`words: only ${early} words typable with f j d k s l e i r u t n a o`);

	console.log(`words: ${bank.words.length}; levels ${JSON.stringify(perLevel)}`);
	console.log(`words per theme: ${JSON.stringify(perTheme)}`);
	const tiers = {};
	for (const word of bank.words) {
		const tier = tierOf(word.text);
		const label = [
			'r-u',
			't-n',
			'a-o',
			'q-m',
			'c-p',
			'e-aigu-apostrophe',
			'g-h',
			'v-b',
			'y-x',
			'z-w',
			'e-grave-a-grave',
			'c-cedille-u-grave'
		].find((id) => tier <= step(id));
		const key = label ?? 'circonflexes-tremas';
		tiers[key] = (tiers[key] ?? 0) + 1;
	}
	console.log(
		`words by cumulative step (first step that makes them typable): ${JSON.stringify(tiers)}`
	);
	console.log(`words typable with f j d k s l e i r u t n a o: ${early}`);
}

function phraseTier(text) {
	const tier = tierOf(text);
	if (tier <= step('r-u')) return 'jusqu a r-u';
	if (tier === step('t-n')) return 't-n';
	if (tier === step('a-o')) return 'a-o';
	if (tier <= step('c-p')) return 'q-m et c-p';
	if (tier === step('e-aigu-apostrophe')) return 'e-aigu et apostrophe';
	if (tier <= step('c-cedille-u-grave')) return 'alphabet complet minuscule';
	if (tier <= step('tiret-deux-points')) return 'majuscule et ponctuation';
	return 'circonflexes et trémas';
}

function checkPhrases() {
	const bank = readJson(CONFIG.output.phrasesFile);
	checkBankHead(bank, CONFIG.output.phraseBankId);
	const themeIds = new Set(CONFIG.themes.map((theme) => theme.id));
	const seen = new Set();
	const perTier = {};
	const perLevel = { 1: 0, 2: 0, 3: 0 };
	let finished = 0;
	for (const phrase of bank.phrases) {
		const { text } = phrase;
		if (text !== text.normalize('NFC') || text !== text.trim() || /\s{2,}/.test(text))
			fail(`phrase "${text}": spacing or normalisation`);
		if (seen.has(text)) fail(`phrase "${text}": duplicate`);
		seen.add(text);
		const bad = unknownChars(text);
		if (bad.length > 0)
			fail(`phrase "${text}": characters outside the learning order: ${bad.join(' ')}`);
		const wordCount = text.split(' ').filter((token) => /\p{L}/u.test(token)).length;
		if (wordCount < PHRASE_WORDS[0] || wordCount > PHRASE_WORDS[1])
			fail(`phrase "${text}": ${wordCount} words`);
		if (![1, 2, 3].includes(phrase.level)) fail(`phrase "${text}": bad level`);
		if (phrase.review !== 'agent' && phrase.review !== 'human')
			fail(`phrase "${text}": bad review`);
		for (const id of phrase.themes)
			if (!themeIds.has(id)) fail(`phrase "${text}": unknown theme ${id}`);
		const hasCapital = /[A-Z]/.test(text);
		const tier = tierOf(text);
		if (hasCapital || /[.?!,:-]/.test(text)) {
			if (!/^[A-Z]/.test(text)) fail(`phrase "${text}": must start with a capital`);
			if (!/[.?!]$/.test(text)) fail(`phrase "${text}": must end with . ? or !`);
			if (/^[A-Z]/.test(text) && /[.?!]$/.test(text)) finished++;
		}
		if (tier >= step('majuscules') && tier <= step('tiret-deux-points') && !/^[A-Z]/.test(text)) {
			fail(`phrase "${text}": punctuation without initial capital`);
		}
		if (/\b[A-Z]/.test(text.slice(1)) && !/[.?!] [A-Z]/.test(text))
			fail(`phrase "${text}": stray capital`);
		const key = phraseTier(text);
		perTier[key] = (perTier[key] ?? 0) + 1;
		perLevel[phrase.level]++;
	}
	const need = (key, min) => {
		if ((perTier[key] ?? 0) < min) fail(`phrases: ${perTier[key] ?? 0} < ${min} for "${key}"`);
	};
	need('jusqu a r-u', MIN_PHRASES_PER_EARLY_TIER);
	need('t-n', MIN_PHRASES_PER_EARLY_TIER);
	need('a-o', MIN_PHRASES_PER_EARLY_TIER);
	need('q-m et c-p', MIN_PHRASES_PER_EARLY_TIER);
	need('e-aigu et apostrophe', MIN_PHRASES_ACCENT_TIER);
	need('alphabet complet minuscule', MIN_PHRASES_FULL_ALPHABET);
	need('majuscule et ponctuation', MIN_PHRASES_CAPITALS);
	need('circonflexes et trémas', MIN_PHRASES_CIRCUMFLEX);
	console.log(`phrases: ${bank.phrases.length}; levels ${JSON.stringify(perLevel)}`);
	console.log(`phrases by first step that makes them typable: ${JSON.stringify(perTier)}`);
	console.log(`phrases with capital and final punctuation: ${finished}`);
}

checkWords();
checkPhrases();
if (errors.length > 0) {
	console.error(`${errors.length} problem(s):`);
	for (const error of errors.slice(0, 80)) console.error(` - ${error}`);
	process.exit(1);
}
console.log('Content checks passed.');
