import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildCharIndex, parseLayout } from '../../keyboard/layout';
import azertyPc from '../../../../layouts/fr-fr-azerty-pc.json';
import { hesitationDelayMs, keyLatencies } from './hesitation';
import { emptyProgress } from './progress';
import type { CharSample, HandGuideRules, ProgressState } from './types';

const AZERTY = buildCharIndex(parseLayout(azertyPc));
const RULES: HandGuideRules = {
	everyKeyUntil: 2,
	newKeysUntil: 39,
	hesitationMs: 3000,
	hesitationFactor: 2,
	hesitationMinKeys: 3,
	hesitationMinCorrect: 10
};

/** A child whose recent right keystrokes on each character took this long before them. */
function timed(times: Readonly<Record<string, number | null>>, correct = 10): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(times).map(([char, latencyMs]) => {
				const sample: CharSample = { attempts: correct, errors: 0, latencyMs };
				return [char, { attempts: correct, errors: 0, recent: [sample] }];
			})
		)
	};
}

describe('keyLatencies', () => {
	it('gathers on a key the characters it types last, weighted by their right keystrokes', () => {
		const progress: ProgressState = {
			lessons: {},
			chars: {
				e: { attempts: 10, errors: 0, recent: [{ attempts: 10, errors: 0, latencyMs: 1000 }] },
				// Through the dead key ^, typed last on the key E.
				ê: { attempts: 6, errors: 1, recent: [{ attempts: 6, errors: 1, latencyMs: 4000 }] }
			}
		};

		expect(keyLatencies(progress, AZERTY)).toEqual(
			new Map([['KeyE', { latencyMs: (1000 * 10 + 4000 * 5) / 15, correct: 15 }]])
		);
	});

	it('leaves out a character without a time, and one the layout does not write', () => {
		expect(keyLatencies(timed({ f: null, ß: 2000 }), AZERTY).size).toBe(0);
	});
});

describe('hesitationDelayMs', () => {
	it('waits the shortest time for a child not measured yet', () => {
		expect(hesitationDelayMs(RULES, emptyProgress(), AZERTY)).toBe(3000);
	});

	it('waits the shortest time while too few keys are measured', () => {
		expect(hesitationDelayMs(RULES, timed({ f: 4000, j: 5000 }), AZERTY)).toBe(3000);
		// A key with fewer right keystrokes than needed is not measured.
		expect(hesitationDelayMs(RULES, timed({ f: 4000, j: 5000, d: 6000 }, 9), AZERTY)).toBe(3000);
	});

	it('waits twice the median time of the measured keys', () => {
		expect(hesitationDelayMs(RULES, timed({ f: 2000, j: 2500, d: 4000 }), AZERTY)).toBe(5000);
		expect(hesitationDelayMs(RULES, timed({ f: 1000, j: 2000, d: 3000, k: 4000 }), AZERTY)).toBe(
			5000
		);
	});

	it('is not drawn up by one slow key: the median, not the mean', () => {
		expect(hesitationDelayMs(RULES, timed({ f: 2000, j: 2100, d: 30_000 }), AZERTY)).toBe(4200);
	});

	it('never waits less than the shortest wait, for a quick child', () => {
		expect(hesitationDelayMs(RULES, timed({ f: 500, j: 600, d: 700 }), AZERTY)).toBe(3000);
	});

	it('waits the shortest time when the rules do not follow the child', () => {
		const fixed: HandGuideRules = { everyKeyUntil: 2, newKeysUntil: 39, hesitationMs: 3000 };
		expect(hesitationDelayMs(fixed, timed({ f: 4000, j: 5000, d: 6000 }), AZERTY)).toBe(3000);
	});

	it('never helps without a shortest wait, nor without a hand guide', () => {
		const slow = timed({ f: 4000, j: 5000, d: 6000 });
		expect(hesitationDelayMs({ ...RULES, hesitationMs: 0 }, slow, AZERTY)).toBe(0);
		const without: HandGuideRules = {
			everyKeyUntil: 2,
			newKeysUntil: 39,
			hesitationFactor: 2,
			hesitationMinKeys: 3,
			hesitationMinCorrect: 10
		};
		expect(hesitationDelayMs(without, slow, AZERTY)).toBe(0);
		expect(hesitationDelayMs(undefined, slow, AZERTY)).toBe(0);
	});

	it('waits between the shortest wait and the factor times the slowest measured key', () => {
		const letters = ['f', 'j', 'd', 'k', 's', 'l', 'e', 'i', 'r', 'u'];
		fc.assert(
			fc.property(
				fc.dictionary(fc.constantFrom(...letters), fc.integer({ min: 1, max: 60_000 })),
				fc.integer({ min: 1, max: 20 }),
				(times, correct) => {
					const progress = timed(times, correct);
					const delay = hesitationDelayMs(RULES, progress, AZERTY);
					const slowest = Math.max(0, ...Object.values(times));
					expect(delay).toBeGreaterThanOrEqual(RULES.hesitationMs ?? 0);
					expect(delay).toBeLessThanOrEqual(
						Math.max(RULES.hesitationMs ?? 0, (RULES.hesitationFactor ?? 0) * slowest)
					);
					expect(hesitationDelayMs(RULES, progress, AZERTY)).toBe(delay);
				}
			)
		);
	});
});
