import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCharIndex, parseLayout } from '../../keyboard/layout';
import { charsByKey, fadedKeys } from './keyboard-fade';
import { charMastery } from './mastery';
import type { CharSample, MasteryRules, ProgressState } from './types';

const AZERTY = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const RULES: MasteryRules = {
	acquiredMinAttempts: 20,
	acquiredMaxErrorRate: 0.1,
	fragileMinAttempts: 5,
	fragileMinErrorRate: 0.2
};
const KNOWN: CharSample = { attempts: 30, errors: 0, latencyMs: null };
const HARD: CharSample = { attempts: 30, errors: 9, latencyMs: null };
const LEARNED = ['f', 'j', ' ', 'd', 'k', 's', 'l', 'e', 'i'];

function progressOf(chars: Record<string, readonly CharSample[]>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, recent]) => [
				char,
				{
					attempts: recent.reduce((sum, sample) => sum + sample.attempts, 0),
					errors: recent.reduce((sum, sample) => sum + sample.errors, 0),
					recent
				}
			])
		)
	};
}

const sampleArb: fc.Arbitrary<CharSample> = fc
	.record({ attempts: fc.integer({ min: 0, max: 40 }), errors: fc.integer({ min: 0, max: 40 }) })
	.map(({ attempts, errors }) => ({
		attempts,
		errors: Math.min(errors, attempts),
		latencyMs: null
	}));

const progressArb: fc.Arbitrary<ProgressState> = fc
	.dictionary(
		fc.constantFrom(...LEARNED, 'F', 'é', 'ê', 'a'),
		fc.array(sampleArb, { maxLength: 3 })
	)
	.map(progressOf);

const learnedArb = fc.subarray([...LEARNED, 'F', 'é', 'ê', 'a', 'z']);

describe('charsByKey', () => {
	it('puts a capital on the key of its letter, never on Shift', () => {
		expect(charsByKey(AZERTY, ['F'])).toEqual(new Map([['KeyF', ['F']]]));
	});

	it('leaves a capital out of a key whose letter is learned', () => {
		expect(charsByKey(AZERTY, ['f', 'F'])).toEqual(new Map([['KeyF', ['f']]]));
	});

	it('puts a character typed with a dead key on both keys it needs', () => {
		const byKey = charsByKey(AZERTY, ['e', 'ê']);
		expect(byKey.get('KeyE')).toEqual(['e', 'ê']);
		expect([...byKey.values()].filter((chars) => chars.includes('ê'))).toHaveLength(2);
	});

	it('leaves Space out: it has no letter to fade', () => {
		expect(charsByKey(AZERTY, [' ', 'f'])).toEqual(new Map([['KeyF', ['f']]]));
	});
});

describe('fadedKeys', () => {
	it('fades the keys whose learned characters are all acquired', () => {
		const progress = progressOf({ f: [KNOWN], j: [KNOWN], d: [HARD] });
		expect(fadedKeys(progress, ['f', 'j', 'd'], AZERTY, RULES)).toEqual(['KeyF', 'KeyJ']);
	});

	it('keeps a key written while one of its learned characters is not acquired', () => {
		const progress = progressOf({ e: [KNOWN] });
		expect(fadedKeys(progress, ['e', 'ê'], AZERTY, RULES)).toEqual([]);
		const known = progressOf({ e: [KNOWN], ê: [KNOWN] });
		expect(fadedKeys(known, ['e', 'ê'], AZERTY, RULES)).toContain('KeyE');
	});

	it('fades a well-known letter even when its capital is not acquired yet', () => {
		const progress = progressOf({ f: [KNOWN] });
		expect(fadedKeys(progress, ['f', 'F'], AZERTY, RULES)).toEqual(['KeyF']);
		expect(fadedKeys(progressOf({}), ['F'], AZERTY, RULES)).toEqual([]);
	});

	it('writes a key again once it is often wrong lately', () => {
		const progress = progressOf({ f: [KNOWN, HARD] });
		expect(fadedKeys(progress, ['f'], AZERTY, RULES)).toEqual([]);
	});

	it('never fades Space, even typed without a mistake', () => {
		const progress = progressOf({ ' ': [KNOWN], f: [KNOWN] });
		expect(fadedKeys(progress, [' ', 'f'], AZERTY, RULES)).toEqual(['KeyF']);
	});

	it('never fades a key that was never typed', () => {
		fc.assert(
			fc.property(progressArb, learnedArb, (progress, learned) => {
				for (const code of fadedKeys(progress, learned, AZERTY, RULES)) {
					const chars = charsByKey(AZERTY, learned).get(code) ?? [];
					expect(chars.length).toBeGreaterThan(0);
					for (const char of chars) {
						expect(progress.chars[char]?.recent.length ?? 0).toBeGreaterThan(0);
					}
				}
			})
		);
	});

	it('keeps written every key with a learned character that is not acquired', () => {
		fc.assert(
			fc.property(progressArb, learnedArb, (progress, learned) => {
				const faded = new Set(fadedKeys(progress, learned, AZERTY, RULES));
				for (const [code, chars] of charsByKey(AZERTY, learned)) {
					const allAcquired = chars.every(
						(char) => charMastery(progress, char, RULES) === 'acquired'
					);
					expect(faded.has(code)).toBe(allAcquired);
				}
			})
		);
	});

	it('fades only keys the learned characters are typed on', () => {
		fc.assert(
			fc.property(progressArb, learnedArb, (progress, learned) => {
				const used = charsByKey(AZERTY, learned);
				for (const code of fadedKeys(progress, learned, AZERTY, RULES)) {
					expect(used.has(code)).toBe(true);
				}
			})
		);
	});
});
