import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { seededRng } from './test-support';
import type { ProgressState, WeakCharRules } from './types';
import {
	capitalized,
	completePhrase,
	coverage,
	isCapital,
	isLetterOrDigit,
	pickPracticeWord,
	weakCharsOf,
	type PracticeWord
} from './word-practice';

function word(text: string, weight = 1): PracticeWord {
	return { text, graphemes: toGraphemes(text), weight };
}

const POOL = ['bébé', 'bol', 'vive', 'vent', 'lune', 'bavard'].map((text) => word(text));

describe('coverage', () => {
	it('counts each character lacking up to what it lacks', () => {
		expect(coverage(word('bébé'), new Map([['b', 5]]))).toBe(2);
		expect(coverage(word('bébé'), new Map([['b', 1]]))).toBe(1);
		expect(
			coverage(
				word('bavard'),
				new Map([
					['b', 2],
					['v', 2]
				])
			)
		).toBe(2);
		expect(coverage(word('lune'), new Map([['b', 2]]))).toBe(0);
		expect(coverage(word('bébé'), new Map([['b', 0]]))).toBe(0);
	});
});

describe('pickPracticeWord', () => {
	const options = (seed: number, used: string[] = [], avoid: (string | undefined)[] = []) => ({
		used: new Set(used),
		avoid,
		rng: seededRng(seed)
	});
	const byB = (candidate: PracticeWord) => coverage(candidate, new Map([['b', 5]]));

	it('takes the word that holds the character most', () => {
		for (let seed = 0; seed < 20; seed++) {
			expect(pickPracticeWord(POOL, byB, options(seed))?.text).toBe('bébé');
		}
	});

	it('takes a word not typed yet before one already typed', () => {
		const seen = new Set<string>();
		for (let seed = 0; seed < 40; seed++) {
			const picked = pickPracticeWord(POOL, byB, options(seed, ['bébé']))?.text as string;
			expect(['bol', 'bavard']).toContain(picked);
			seen.add(picked);
		}
		expect(seen.size).toBe(2);
	});

	it('comes back to the words already typed when every one was', () => {
		const used = ['bébé', 'bol', 'bavard'];
		expect(pickPracticeWord(POOL, byB, options(1, used))?.text).toBe('bébé');
	});

	it('never takes a text to avoid, so that none comes twice in a row', () => {
		for (let seed = 0; seed < 20; seed++) {
			const picked = pickPracticeWord(POOL, byB, options(seed, [], ['bébé', undefined]))?.text;
			expect(['bol', 'bavard']).toContain(picked);
		}
	});

	it('takes a short word more often than a long one of the same score', () => {
		let short = 0;
		for (let seed = 0; seed < 300; seed++) {
			if (pickPracticeWord(POOL, byB, options(seed, ['bébé']))?.text === 'bol') short += 1;
		}
		expect(short).toBeGreaterThan(170);
		expect(short).toBeLessThan(260);
	});

	it('follows the weight of the words', () => {
		const pool = [word('bol', 1), word('bal', 20)];
		let heavy = 0;
		for (let seed = 0; seed < 100; seed++) {
			if (pickPracticeWord(pool, byB, options(seed))?.text === 'bal') heavy += 1;
		}
		expect(heavy).toBeGreaterThan(85);
	});

	it('gives nothing when no word scores', () => {
		expect(pickPracticeWord(POOL, () => 0, options(1))).toBeUndefined();
		expect(pickPracticeWord([], byB, options(1))).toBeUndefined();
		expect(pickPracticeWord([word('bol')], byB, options(1, [], ['bol']))).toBeUndefined();
	});
});

describe('weakCharsOf', () => {
	const RULES: WeakCharRules = { minCount: 4, maxChars: 2, minAttempts: 5, minErrorRate: 0.2 };
	const recent = (attempts: number, errors: number) => ({
		attempts: 100,
		errors: 0,
		recent: [{ attempts, errors, latencyMs: null }]
	});
	const progress: ProgressState = {
		lessons: {},
		chars: {
			a: recent(10, 3),
			b: recent(10, 5),
			c: recent(10, 2),
			d: recent(4, 4),
			e: recent(20, 10),
			f: { attempts: 50, errors: 50, recent: [{ attempts: 10, errors: 0, latencyMs: null }] }
		}
	};

	it('keeps the characters wrong too often lately, the worst first, as many as allowed', () => {
		expect(weakCharsOf(progress, [...'abcdefg'], RULES)).toEqual(['b', 'e']);
		expect(weakCharsOf(progress, [...'abcdefg'], { ...RULES, maxChars: 5 })).toEqual([
			'b',
			'e',
			'a'
		]);
	});

	it('leaves out a character at the threshold, typed too little, or wrong only long ago', () => {
		const all = weakCharsOf(progress, [...'abcdefg'], { ...RULES, maxChars: 10 });
		expect(all).not.toContain('c');
		expect(all).not.toContain('d');
		expect(all).not.toContain('f');
		expect(all).not.toContain('g');
	});

	it('only looks at the characters it is given, in their order on a tie', () => {
		expect(weakCharsOf(progress, ['e', 'a'], RULES)).toEqual(['e', 'a']);
		expect(weakCharsOf(progress, ['e', 'b'], RULES)).toEqual(['e', 'b']);
		expect(weakCharsOf(progress, [], RULES)).toEqual([]);
	});
});

describe('capitalized', () => {
	const learned = new Set(['l', 'e', 'é', 'L', 'E', ' ']);

	it('gives a capital first letter when that capital is learned', () => {
		expect(capitalized('le', learned)).toBe('Le');
		expect(capitalized('elle', learned)).toBe('Elle');
	});

	it('gives nothing for a capital not learned, an accented letter or a text that has one', () => {
		expect(capitalized('le', new Set(['l', 'e']))).toBeUndefined();
		expect(capitalized('été', learned)).toBeUndefined();
		expect(capitalized('Le', learned)).toBeUndefined();
		expect(capitalized('', learned)).toBeUndefined();
	});
});

describe('completePhrase', () => {
	const learned = new Set([...'jefuisl .!', 'J', 'E', 'L', 'é']);

	it('gives an early phrase its capital and its full stop', () => {
		expect(completePhrase('je fuis le feu', learned, '.')).toBe('Je fuis le feu.');
	});

	it('leaves a phrase that already has them as it is', () => {
		expect(completePhrase('Je fuis.', learned, '.')).toBe('Je fuis.');
		expect(completePhrase('Je fuis !', learned, '.')).toBe('Je fuis !');
	});

	it('adds the full stop alone when the capital cannot be typed', () => {
		expect(completePhrase('élu le feu', learned, '.')).toBe('élu le feu.');
	});

	it('adds the capital alone when the phrase ends with a mark', () => {
		expect(completePhrase('je fuis !', learned, '.')).toBe('Je fuis !');
	});

	it('changes nothing before the mark or the capitals are learned', () => {
		expect(completePhrase('je fuis', new Set([...'jefuis ', 'J']), '.')).toBe('je fuis');
		expect(completePhrase('je fuis', new Set([...'jefuis .']), '.')).toBe('je fuis');
	});
});

describe('isCapital and isLetterOrDigit', () => {
	it('tell capitals, letters and digits from the rest', () => {
		expect(['A', 'É'].every(isCapital)).toBe(true);
		expect(['a', '1', '.', ' '].some(isCapital)).toBe(false);
		expect(['a', 'é', 'A', '7'].every(isLetterOrDigit)).toBe(true);
		expect(['.', ' ', "'", '@', '\n'].some(isLetterOrDigit)).toBe(false);
	});
});
