import fc from 'fast-check';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isGateAnswer, parseGateNumbers, pickGateNumber, readDigits } from './gate';

const VALID = {
	schemaVersion: 1,
	id: 'xx.gate-numbers.test',
	locale: 'xx',
	numbers: [
		{ value: 12, words: 'twelve' },
		{ value: 345, words: 'three hundred forty-five' },
		{ value: 6000, words: 'six thousand' }
	]
};

const languages = readdirSync('content', { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && entry.name !== 'common')
	.map((entry) => entry.name);

describe('parseGateNumbers', () => {
	it('accepts a valid file', () => {
		expect(parseGateNumbers(VALID).numbers).toHaveLength(3);
	});

	it.each([
		['a number written with digits', { value: 7, words: 'sept 7' }],
		['a duplicate value', { value: 12, words: 'douze' }],
		['a negative value', { value: -1, words: 'moins un' }],
		['empty words', { value: 9, words: '' }]
	])('refuses %s', (_label, entry) => {
		expect(() => parseGateNumbers({ ...VALID, numbers: [...VALID.numbers, entry] })).toThrow();
	});

	it('refuses a file with a single number', () => {
		expect(() => parseGateNumbers({ ...VALID, numbers: [VALID.numbers[0]] })).toThrow();
	});

	it('refuses an unknown property', () => {
		expect(() => parseGateNumbers({ ...VALID, extra: true })).toThrow();
	});

	it.each(languages)('accepts the numbers shipped for %s', (language) => {
		const path = `content/${language}/adult/gate-numbers.json`;
		const parsed = parseGateNumbers(JSON.parse(readFileSync(path, 'utf8')));
		expect(parsed.locale).toBe(language);
	});
});

/*
 * The gate keeps out a child who opens it by mistake, not an adult (E-09, choice 12 of ADR-075):
 * short numbers, without the tens that French writes in three ways. « soixante-dix »,
 * « quatre-vingts » and « quatre-vingt-dix » are « septante », « huitante » and « nonante » in
 * Belgium and Switzerland, and they stop a parent who is dyslexic or dyscalculic.
 */
describe('the French numbers of the gate', () => {
	const { numbers } = parseGateNumbers(
		JSON.parse(readFileSync('content/fr/adult/gate-numbers.json', 'utf8'))
	);
	const TENS_WRITTEN_THREE_WAYS = [7, 8, 9];
	const FORMS_WRITTEN_THREE_WAYS =
		/soixante[- ]dix|soixante et onze|quatre[- ]vingt|septante|huitante|octante|nonante/;

	it('are written with two or three digits', () => {
		expect(numbers.length).toBeGreaterThanOrEqual(20);
		for (const number of numbers) {
			expect(number.value, number.words).toBeGreaterThanOrEqual(10);
			expect(number.value, number.words).toBeLessThanOrEqual(999);
		}
	});

	it('never have tens that French writes in three ways', () => {
		for (const number of numbers) {
			const tens = Math.floor(number.value / 10) % 10;
			expect(TENS_WRITTEN_THREE_WAYS, `${number.value}`).not.toContain(tens);
			expect(number.words).not.toMatch(FORMS_WRITTEN_THREE_WAYS);
		}
	});
});

describe('pickGateNumber', () => {
	const { numbers } = parseGateNumbers(VALID);

	it('never asks twice in a row for the same number', () => {
		fc.assert(
			fc.property(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), (draw) => {
				for (const previous of numbers) {
					expect(pickGateNumber(numbers, () => draw, previous.value).value).not.toBe(
						previous.value
					);
				}
			})
		);
	});

	it('can ask for any number the first time', () => {
		const picked = new Set(
			[0, 0.4, 0.99].map((draw) => pickGateNumber(numbers, () => draw, null).value)
		);
		expect(picked.size).toBe(3);
	});
});

describe('readDigits', () => {
	it('reads digits, with spaces between thousands', () => {
		expect(readDigits('2 471')).toBe(2471);
		expect(readDigits(' 147 ')).toBe(147);
		expect(readDigits('2\u202F471')).toBe(2471);
	});

	it.each(['', 'cent', '14a', '-3', '1.5', '１２'])('refuses "%s"', (text) => {
		expect(readDigits(text)).toBeNull();
	});

	it('gives back any whole number written in digits', () => {
		fc.assert(
			fc.property(fc.nat(), (value) => {
				expect(readDigits(String(value))).toBe(value);
			})
		);
	});
});

describe('isGateAnswer', () => {
	it('accepts the number in digits and nothing else', () => {
		const [number] = parseGateNumbers(VALID).numbers.slice(1);
		if (!number) throw new Error('missing number');
		expect(isGateAnswer(number, '345')).toBe(true);
		expect(isGateAnswer(number, '354')).toBe(false);
		expect(isGateAnswer(number, number.words)).toBe(false);
	});
});
