import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = resolve(CONTENT_DIR, '..', '..');
export const CACHE_DIR = join(CONTENT_DIR, '.cache');
export const DATA_DIR = join(CONTENT_DIR, 'data');

export const CONFIG = JSON.parse(readFileSync(join(CONTENT_DIR, 'config.json'), 'utf8'));

/** Characters introduced by each step of the learning order (ADR-018); the tier of a text is its last step. */
export const LEARNING_STEPS = [
	{ id: 'f-j', chars: ['f', 'j'] },
	{ id: 'espace', chars: [' '] },
	{ id: 'd-k', chars: ['d', 'k'] },
	{ id: 's-l', chars: ['s', 'l'] },
	{ id: 'e-i', chars: ['e', 'i'] },
	{ id: 'r-u', chars: ['r', 'u'] },
	{ id: 't-n', chars: ['t', 'n'] },
	{ id: 'a-o', chars: ['a', 'o'] },
	{ id: 'q-m', chars: ['q', 'm'] },
	{ id: 'c-p', chars: ['c', 'p'] },
	{ id: 'e-aigu-apostrophe', chars: ['é', "'"] },
	{ id: 'g-h', chars: ['g', 'h'] },
	{ id: 'v-b', chars: ['v', 'b'] },
	{ id: 'y-x', chars: ['y', 'x'] },
	{ id: 'z-w', chars: ['z', 'w'] },
	{ id: 'e-grave-a-grave', chars: ['è', 'à'] },
	{ id: 'c-cedille-u-grave', chars: ['ç', 'ù'] },
	{ id: 'majuscules', chars: [] },
	{ id: 'virgule-point', chars: [',', '.'] },
	{ id: 'interrogation-exclamation', chars: ['?', '!'] },
	{ id: 'tiret-deux-points', chars: ['-', ':'] },
	{ id: 'circonflexes', chars: ['ê', 'â', 'î', 'ô', 'û'] },
	{ id: 'trémas', chars: ['ë', 'ï', 'ü'] }
];

export const STEP_INDEX = Object.fromEntries(LEARNING_STEPS.map((step, i) => [step.id, i]));
const UPPERCASE_STEP = STEP_INDEX['majuscules'];

const charStep = new Map();
LEARNING_STEPS.forEach((step, i) => step.chars.forEach((char) => charStep.set(char, i)));
'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter) => {
	if (!charStep.has(letter)) charStep.set(letter, -1);
});

/** Index of the learning step that makes the text typable; -1 when a character is never learned. */
export function tierOf(text) {
	let tier = 0;
	for (const char of text.normalize('NFC')) {
		if (char >= 'A' && char <= 'Z') {
			tier = Math.max(tier, UPPERCASE_STEP, charStep.get(char.toLowerCase()) ?? -1);
			continue;
		}
		const step = charStep.get(char);
		if (step === undefined || step < 0) return -1;
		tier = Math.max(tier, step);
	}
	return tier;
}

/** Characters of the text that no step of the learning order ever introduces. */
export function unknownChars(text) {
	const bad = new Set();
	for (const char of text.normalize('NFC')) {
		const lower = char >= 'A' && char <= 'Z' ? char.toLowerCase() : char;
		if (!charStep.has(lower) || charStep.get(lower) < 0) bad.add(char);
	}
	return [...bad];
}

export function readLines(path) {
	if (!existsSync(path)) return [];
	return readFileSync(path, 'utf8')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line !== '' && !line.startsWith('#'));
}

/** Lines of the form `field | field | ...`; a trailing `# comment` is dropped. */
export function readTable(path) {
	return readLines(path).map((line) =>
		line
			.replace(/\s+#.*$/, '')
			.split('|')
			.map((cell) => cell.trim())
	);
}

export function ensureDir(dir) {
	mkdirSync(dir, { recursive: true });
}

export function writeText(path, text) {
	ensureDir(dirname(path));
	writeFileSync(path, text, 'utf8');
}

const PRINT_WIDTH = 100;
const TAB_WIDTH = 2;

function isPrimitive(value) {
	return value === null || typeof value !== 'object';
}

/** Serialises like Prettier 3 does for JSON with tabs, so that `prettier --check` passes. */
export function toPrettierJson(value, depth = 0) {
	const pad = '\t'.repeat(depth);
	const inner = '\t'.repeat(depth + 1);
	const width = (text) => text.length + depth * TAB_WIDTH;
	if (isPrimitive(value)) return JSON.stringify(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const flat = `[${value.map((item) => toPrettierJson(item, depth + 1)).join(', ')}]`;
		if (value.every(isPrimitive) && width(flat) <= PRINT_WIDTH) return flat;
		return `[\n${value.map((item) => inner + toPrettierJson(item, depth + 1)).join(',\n')}\n${pad}]`;
	}
	const entries = Object.entries(value);
	if (entries.length === 0) return '{}';
	return `{\n${entries
		.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${toPrettierJson(item, depth + 1)}`)
		.join(',\n')}\n${pad}}`;
}

/** An object written on a single line, which Prettier keeps when it fits the print width. */
export function compactEntry(entry, depth) {
	const parts = Object.entries(entry).map(
		([key, item]) => `${JSON.stringify(key)}: ${toPrettierJson(item, 0)}`
	);
	const line = `{ ${parts.join(', ')} }`;
	return line.length + depth * TAB_WIDTH + 1 <= PRINT_WIDTH ? line : null;
}

export function writeBankJson(path, bank, listKey) {
	const { [listKey]: list, ...head } = bank;
	const pad = '\t';
	const items = list.map((entry) => {
		const compact = compactEntry(entry, 2);
		return `${pad}${pad}${compact ?? toPrettierJson(entry, 2)}`;
	});
	const headLines = Object.entries(head).map(
		([key, item]) => `${pad}${JSON.stringify(key)}: ${toPrettierJson(item, 1)}`
	);
	const body = [...headLines, `${pad}${JSON.stringify(listKey)}: [\n${items.join(',\n')}\n${pad}]`];
	writeText(path, `{\n${body.join(',\n')}\n}\n`);
}

export function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		if (!argv[i].startsWith('--')) continue;
		const key = argv[i].slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) args[key] = true;
		else {
			args[key] = next;
			i++;
		}
	}
	return args;
}
