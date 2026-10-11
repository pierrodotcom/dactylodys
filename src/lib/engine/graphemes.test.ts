import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from './graphemes';

describe('toGraphemes', () => {
	it('splits plain ASCII text into characters', () => {
		expect(toGraphemes('abc')).toEqual(['a', 'b', 'c']);
	});

	it('returns an empty list for an empty string', () => {
		expect(toGraphemes('')).toEqual([]);
	});

	it('normalizes decomposed accents to NFC', () => {
		const decomposed = 'é';
		expect(toGraphemes(decomposed)).toEqual(['é']);
	});

	it('converts CRLF and CR to a single line feed', () => {
		expect(toGraphemes('a\r\nb')).toEqual(['a', '\n', 'b']);
		expect(toGraphemes('a\rb')).toEqual(['a', '\n', 'b']);
		expect(toGraphemes('a\nb')).toEqual(['a', '\n', 'b']);
		expect(toGraphemes('\r\n\r\n')).toEqual(['\n', '\n']);
	});

	it('keeps an emoji with a skin tone modifier as one grapheme', () => {
		expect(toGraphemes('a\u{1F44D}\u{1F3FD}b')).toEqual(['a', '\u{1F44D}\u{1F3FD}', 'b']);
	});

	it('keeps a ZWJ emoji sequence as one grapheme', () => {
		const family = '\u{1F469}‍\u{1F467}';
		expect(toGraphemes(family)).toEqual([family]);
	});

	it('keeps a base letter with a combining mark that has no precomposed form as one grapheme', () => {
		const letter = 'x́';
		expect(toGraphemes(letter)).toEqual([letter]);
	});

	it('keeps apostrophes and space variants distinct', () => {
		expect(toGraphemes("'’  ")).toEqual(["'", '’', ' ', ' ']);
	});

	it('is idempotent on its own output', () => {
		fc.assert(
			fc.property(fc.string({ unit: 'grapheme' }), (text) => {
				const once = toGraphemes(text);
				return JSON.stringify(toGraphemes(once.join(''))) === JSON.stringify(once);
			})
		);
	});

	it('never produces a carriage return', () => {
		fc.assert(
			fc.property(fc.string({ unit: 'binary' }), (text) => {
				return toGraphemes(text).every((grapheme) => !grapheme.includes('\r'));
			})
		);
	});
});
