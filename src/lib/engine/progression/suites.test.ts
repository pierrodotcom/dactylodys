import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildPatternSuite, type SuiteChars, type SuiteOptions } from './suites';
import { seededRng } from './test-support';
import type { DrillPatternRules } from './types';

const SPACE = ' ';
const PATTERNS: DrillPatternRules = {
	vowels: ['a', 'e', 'i', 'o', 'u'],
	shapes: [
		'CD',
		'CDC',
		'CCD',
		'CDCD',
		'C D',
		'CD C',
		'CV',
		'CVCV',
		'CVCW',
		'CVDV',
		'CV CW',
		'CV DV'
	]
};

function optionsOf(seed: number, change: Partial<SuiteOptions> = {}): SuiteOptions {
	return { length: [2, 5], newCharWeight: 0.6, weightOf: () => 1, rng: seededRng(seed), ...change };
}

function suitesOf(chars: SuiteChars, change: Partial<SuiteOptions> = {}, runs = 60): string[] {
	const suites: string[] = [];
	for (let seed = 0; seed < runs; seed++) {
		const suite = buildPatternSuite(PATTERNS, chars, optionsOf(seed, change));
		if (suite !== undefined) suites.push(suite);
	}
	return suites;
}

describe('buildPatternSuite', () => {
	it('alternates the two new keys when nothing else is known', () => {
		const suites = suitesOf({ forced: ['f', 'j'], fresh: [], known: [] }, { length: [2, 4] });
		expect(suites).toHaveLength(60);
		for (const suite of suites) {
			expect(suite).toMatch(/^[fj]{2,4}$/);
			expect(suite).toContain('f');
			expect(suite).toContain('j');
		}
		expect(new Set(suites).size).toBeGreaterThan(3);
	});

	it('pairs a new consonant with known vowels, so that the suite can be said aloud', () => {
		const suites = suitesOf(
			{ forced: ['v'], fresh: [], known: ['a', 'e', 'i', 's', 'l', SPACE] },
			{ length: [4, 5] }
		);
		expect(suites).toHaveLength(60);
		for (const suite of suites) {
			expect(suite).toContain('v');
			expect(suite).toMatch(/^[a-z][aei][a-z][aei]$|^[a-z][aei] [a-z][aei]$/);
		}
		expect(suites.some((suite) => /^v[aei] v[aei]$/.test(suite))).toBe(true);
	});

	it('gives a new vowel the place of a vowel', () => {
		const suites = suitesOf(
			{ forced: ['e', 'i'], fresh: [], known: ['f', 'j', 'd', 'k', SPACE] },
			{ length: [4, 5] }
		);
		expect(suites.length).toBeGreaterThan(0);
		for (const suite of suites) {
			expect(suite).toMatch(/^[fjdk][ei][fjdk][ei]$|^[fjdk][ei] [fjdk][ei]$/);
			expect(suite).toContain('e');
			expect(suite).toContain('i');
		}
	});

	it('prefers a shape with a vowel as soon as one is known', () => {
		const suites = suitesOf(
			{ forced: [], fresh: ['t', 'n'], known: ['e', 'i', 's', 'l'] },
			{ length: [2, 4] }
		);
		for (const suite of suites) expect(suite).toMatch(/[ei]/);
	});

	it('holds a space only when the space is known, and always when it is asked', () => {
		const without = suitesOf({ forced: [], fresh: ['d', 'k'], known: ['f', 'j'] });
		for (const suite of without) expect(suite).not.toContain(SPACE);
		const asked = suitesOf({ forced: [SPACE], fresh: [], known: ['f', 'j'] }, { length: [3, 4] });
		expect(asked).toHaveLength(60);
		for (const suite of asked) expect(suite).toMatch(/^[fj]+ [fj]+$/);
	});

	it('takes a new key rather than a known one as often as the weight says', () => {
		const share = (newCharWeight: number) => {
			const suites = suitesOf(
				{ forced: [], fresh: ['d', 'k'], known: ['f', 'j'] },
				{ length: [2, 2], newCharWeight },
				200
			);
			const chars = suites.flatMap((suite) => [...suite]);
			return chars.filter((char) => 'dk'.includes(char)).length / chars.length;
		};
		expect(share(1)).toBe(1);
		expect(share(0)).toBe(0);
		expect(share(0.5)).toBeGreaterThan(0.3);
		expect(share(0.5)).toBeLessThan(0.7);
	});

	it('brings a heavier character back more often among those of its kind', () => {
		const count = (weightOf: (char: string) => number) =>
			suitesOf({ forced: [], fresh: [], known: ['f', 'j', 'd', 'k'] }, { weightOf }, 200)
				.flatMap((suite) => [...suite])
				.filter((char) => char === 'k').length;
		expect(count((char) => (char === 'k' ? 5 : 1))).toBeGreaterThan(count(() => 1) * 1.3);
	});

	it.each([
		['a mark to place', { forced: [','], fresh: [], known: ['a', 'l'] }],
		['a digit to place', { forced: ['1'], fresh: [], known: ['a', 'l'] }],
		['three characters to place', { forced: ['b', 'c', 'd'], fresh: [], known: ['a'] }],
		['two vowels to place and no consonant', { forced: ['a', 'e'], fresh: [], known: [] }],
		['no letter at all', { forced: [], fresh: [], known: [SPACE] }]
	])('gives nothing with %s', (_name, chars) => {
		expect(buildPatternSuite(PATTERNS, chars, optionsOf(1))).toBeUndefined();
	});

	it('gives nothing when no shape has the right length', () => {
		const chars = { forced: ['f', 'j'], fresh: [], known: [] };
		expect(buildPatternSuite(PATTERNS, chars, optionsOf(1, { length: [7, 9] }))).toBeUndefined();
	});

	it('keeps to the length, to the characters given and to two new and two known ones', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 2 ** 32 - 1 }),
				fc.subarray(['t', 'n', 'a', 'o'], { maxLength: 2 }),
				fc.subarray(['r', 'u', 'p']),
				fc.subarray(['f', 'j', 'd', 'k', 'e', 'i', SPACE]),
				fc.integer({ min: 2, max: 5 }),
				fc.integer({ min: 0, max: 2 }),
				(seed, forced, fresh, known, min, extra) => {
					const chars = { forced, fresh, known };
					const length: [number, number] = [min, min + extra];
					const suite = buildPatternSuite(PATTERNS, chars, optionsOf(seed, { length }));
					expect(buildPatternSuite(PATTERNS, chars, optionsOf(seed, { length }))).toBe(suite);
					if (suite === undefined) return;
					expect(suite.length).toBeGreaterThanOrEqual(min);
					expect(suite.length).toBeLessThanOrEqual(min + extra);
					expect(suite).not.toMatch(/^ | $| {2}|(.)\1\1/u);
					const used = new Set([...suite].filter((char) => char !== SPACE));
					for (const char of used) expect([...forced, ...fresh, ...known]).toContain(char);
					for (const char of forced) expect(suite).toContain(char);
					const isNew = (char: string) => forced.includes(char) || fresh.includes(char);
					expect([...used].filter(isNew).length).toBeLessThanOrEqual(2);
					expect([...used].filter((char) => !isNew(char)).length).toBeLessThanOrEqual(2);
				}
			),
			{ numRuns: 300 }
		);
	});
});
