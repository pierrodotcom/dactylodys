import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCharIndex, findUnproducible, parseLayout } from '../../keyboard/layout';
import { toGraphemes } from '../graphemes';
import { isTypable, readAdultWords, splitWords, type AdultWordRules } from './words';

const AZERTY = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const RULES: AdultWordRules = { maxWords: 5, maxWordLength: 8 };

describe('splitWords', () => {
	it('cuts at spaces, line breaks, commas and semicolons, and keeps each word once', () => {
		expect(splitWords(' lune, vélo;\n\tlune  chat\r\nsoleil;;')).toEqual([
			'lune',
			'vélo',
			'chat',
			'soleil'
		]);
	});

	it('writes the words in NFC, so that a decomposed accent is the same word', () => {
		const decomposed = 'vélo';
		expect(splitWords(`${decomposed} vélo`)).toEqual(['vélo']);
	});

	it('gives nothing for a blank text', () => {
		expect(splitWords(' \n, ;')).toEqual([]);
	});
});

describe('readAdultWords', () => {
	it('keeps the words the layout types and lists the others with what they lack', () => {
		const reading = readAdultWords('lune ÉTÉ façade château Ça', AZERTY, RULES);
		expect(reading.words).toEqual(['lune', 'façade', 'château']);
		expect(reading.unproducible).toEqual([
			{ word: 'ÉTÉ', chars: ['É'] },
			{ word: 'Ça', chars: ['Ç'] }
		]);
		expect(reading.tooLong).toEqual([]);
		expect(reading.leftOver).toBe(0);
	});

	it('refuses the words longer than the limit, counted in characters', () => {
		const reading = readAdultWords('anticonstitutionnel éléphant', AZERTY, RULES);
		expect(reading.words).toEqual(['éléphant']);
		expect(reading.tooLong).toEqual(['anticonstitutionnel']);
	});

	it('keeps the first words up to the limit and counts the ones left out', () => {
		const reading = readAdultWords('a b c d e f g', AZERTY, RULES);
		expect(reading.words).toEqual(['a', 'b', 'c', 'd', 'e']);
		expect(reading.leftOver).toBe(2);
	});

	it('refuses limits that are not positive integers', () => {
		expect(() => readAdultWords('a', AZERTY, { maxWords: 0, maxWordLength: 3 })).toThrow(
			/maxWords/
		);
	});

	it('never keeps a word with a character the layout does not type, nor too many, nor too long', () => {
		const pieces = fc.constantFrom('a', 'é', 'Ç', 'É', '€', '✓', 'ß', 'q', 'ù', 'ñ', 'z');
		const word = fc.array(pieces, { minLength: 1, maxLength: 10 }).map((chars) => chars.join(''));
		const separator = fc.constantFrom(' ', '\n', ',', ';', ' , ');
		fc.assert(
			fc.property(fc.array(fc.tuple(word, separator), { maxLength: 12 }), (parts) => {
				const text = parts.map(([w, s]) => w + s).join('');
				const reading = readAdultWords(text, AZERTY, RULES);
				expect(reading.words.length).toBeLessThanOrEqual(RULES.maxWords);
				expect(new Set(reading.words).size).toBe(reading.words.length);
				for (const kept of reading.words) {
					expect(findUnproducible(AZERTY, kept)).toEqual([]);
					expect(toGraphemes(kept).length).toBeLessThanOrEqual(RULES.maxWordLength);
					expect(isTypable(AZERTY, kept)).toBe(true);
				}
				const sorted =
					reading.words.length +
					reading.unproducible.length +
					reading.tooLong.length +
					reading.leftOver;
				expect(sorted).toBe(splitWords(text).length);
			})
		);
	});
});
