import { findUnproducible } from '../../keyboard/layout';
import type { CharIndex } from '../../keyboard/types';
import { toGraphemes } from '../graphemes';

/** Limits of the list of words given by the adult: data, never constants in the code. */
export interface AdultWordRules {
	/** Words kept at most; the others are left out, and said so. */
	readonly maxWords: number;
	/** Characters (graphemes) of the longest word kept. */
	readonly maxWordLength: number;
}

/** A word the keyboard of the child cannot type, with the characters it lacks. */
export interface UnproducibleWord {
	readonly word: string;
	readonly chars: readonly string[];
}

/** What a pasted list of words gives: the words kept, and why the others were not. */
export interface AdultWordsReading {
	/** In the order of the list, each once, written in NFC. */
	readonly words: readonly string[];
	readonly unproducible: readonly UnproducibleWord[];
	readonly tooLong: readonly string[];
	/** Words that could be typed but came after `maxWords` others. */
	readonly leftOver: number;
}

/** Spaces, line breaks, commas and semicolons separate the words of a list. */
const SEPARATORS = /[\s,;]+/u;

function assertRules(rules: AdultWordRules) {
	for (const [name, value] of Object.entries(rules)) {
		if (!Number.isSafeInteger(value) || value < 1) {
			throw new RangeError(`${name} must be a positive integer`);
		}
	}
}

/** The words of a list, written in NFC, in their order, each once. */
export function splitWords(text: string): string[] {
	const words = text
		.normalize('NFC')
		.split(SEPARATORS)
		.filter((word) => word !== '');
	return [...new Set(words)];
}

/** Whether every character of the word comes from a key of the layout. */
export function isTypable(index: CharIndex, word: string): boolean {
	return word !== '' && findUnproducible(index, word).length === 0;
}

/**
 * Reads the list the adult pasted: each word once, no longer than `maxWordLength`, and only words
 * the layout of the child can type, `maxWords` at most. Nothing is changed in a word: a word
 * refused is listed, never corrected.
 */
export function readAdultWords(
	text: string,
	index: CharIndex,
	rules: AdultWordRules
): AdultWordsReading {
	assertRules(rules);
	const words: string[] = [];
	const unproducible: UnproducibleWord[] = [];
	const tooLong: string[] = [];
	let leftOver = 0;
	for (const word of splitWords(text)) {
		const chars = findUnproducible(index, word);
		if (toGraphemes(word).length > rules.maxWordLength) tooLong.push(word);
		else if (chars.length > 0) unproducible.push({ word, chars });
		else if (words.length >= rules.maxWords) leftOver += 1;
		else words.push(word);
	}
	return { words, unproducible, tooLong, leftOver };
}
