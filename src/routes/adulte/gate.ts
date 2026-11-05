import type { Rng } from '$lib/engine/progression/types';

/** A number and the way it is written in words in one language. */
export interface GateNumber {
	readonly value: number;
	readonly words: string;
}

/** `content/<language>/adult/gate-numbers.json`: the numbers the gate of the adult space asks for. */
export interface GateNumbers {
	readonly schemaVersion: 1;
	/** `<language>.gate-numbers.<slug>`. */
	readonly id: string;
	readonly locale: string;
	readonly numbers: readonly GateNumber[];
}

const KEYS = ['schemaVersion', 'id', 'locale', 'numbers'] as const;
const NUMBER_KEYS = ['value', 'words'] as const;
/* Two at least: the gate always shows a number other than the one before. */
const MIN_NUMBERS = 2;
const ANY_DIGIT = /\p{Nd}/u;
const ASCII_DIGITS = /^[0-9]+$/;
/* Spaces an adult may put between thousands, as some languages write them. */
const SPACES = /[\s\u00A0\u202F]/gu;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectExactKeys(record: Record<string, unknown>, keys: readonly string[], path: string) {
	for (const key of Object.keys(record)) {
		if (!keys.includes(key)) fail(`${path}.${key}`, 'unknown property');
	}
	for (const key of keys) {
		if (!Object.hasOwn(record, key)) fail(`${path}.${key}`, 'missing property');
	}
}

/** Validates a file of gate numbers; throws an explicit error. */
export function parseGateNumbers(data: unknown): GateNumbers {
	if (!isRecord(data)) fail('gateNumbers', 'expected an object');
	expectExactKeys(data, KEYS, 'gateNumbers');
	if (data['schemaVersion'] !== 1) fail('gateNumbers.schemaVersion', 'expected 1');
	const id = data['id'];
	if (typeof id !== 'string' || id === '') fail('gateNumbers.id', 'expected a non-empty string');
	const locale = data['locale'];
	if (typeof locale !== 'string' || locale === '') {
		fail('gateNumbers.locale', 'expected a non-empty string');
	}
	const raw = data['numbers'];
	if (!Array.isArray(raw) || raw.length < MIN_NUMBERS) {
		fail('gateNumbers.numbers', `expected at least ${MIN_NUMBERS} numbers`);
	}
	const numbers: GateNumber[] = [];
	raw.forEach((entry: unknown, index) => {
		const path = `gateNumbers.numbers[${index}]`;
		if (!isRecord(entry)) fail(path, 'expected an object');
		expectExactKeys(entry, NUMBER_KEYS, path);
		const value = entry['value'];
		if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
			fail(`${path}.value`, 'expected a non-negative integer');
		}
		const words = entry['words'];
		if (typeof words !== 'string' || words.trim() !== words || words === '') {
			fail(`${path}.words`, 'expected a trimmed, non-empty text');
		}
		if (ANY_DIGIT.test(words)) fail(`${path}.words`, 'expected words, not digits');
		if (numbers.some((other) => other.value === value)) fail(`${path}.value`, 'duplicate value');
		if (numbers.some((other) => other.words === words)) fail(`${path}.words`, 'duplicate words');
		numbers.push({ value, words: words.normalize('NFC') });
	});
	return { schemaVersion: 1, id, locale, numbers };
}

/** A number to ask for, never the one asked just before (`previous`, `null` the first time). */
export function pickGateNumber(
	numbers: readonly GateNumber[],
	rng: Rng,
	previous: number | null
): GateNumber {
	const choices = numbers.filter((number) => number.value !== previous);
	const pool = choices.length > 0 ? choices : numbers;
	const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
	const picked = pool[index];
	if (picked === undefined) throw new RangeError('no gate number to pick');
	return picked;
}

/** The whole number written in digits, spaces between them allowed; `null` for anything else. */
export function readDigits(text: string): number | null {
	const compact = text.replace(SPACES, '');
	if (!ASCII_DIGITS.test(compact)) return null;
	const value = Number(compact);
	return Number.isSafeInteger(value) ? value : null;
}

export function isGateAnswer(number: GateNumber, text: string): boolean {
	return readDigits(text) === number.value;
}
