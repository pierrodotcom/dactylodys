import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseResultRules } from './result-rules';

const VALID = {
	schemaVersion: 1,
	consolidation: { minRecentAttempts: 15, maxErrorRate: 0.2, maxKeys: 2 },
	support: { afterFailedPlays: 2, closeMargin: 3, wordLevel: 1 }
};

describe('parseResultRules', () => {
	it('reads the rules of the result shipped with the game', () => {
		const shipped = parseResultRules(
			JSON.parse(readFileSync('content/common/result-rules.json', 'utf8'))
		);

		// The thresholds the audit proposed and the owner approved (ADR-075, choice 3; P-11).
		expect(shipped.consolidation).toEqual({ minRecentAttempts: 15, maxErrorRate: 0.2, maxKeys: 2 });
		expect(shipped.support).toEqual({ afterFailedPlays: 2, closeMargin: 3, wordLevel: 1 });
	});

	it('gives back the rules it is given', () => {
		expect(parseResultRules(VALID)).toEqual(VALID);
	});

	it.each<[string, unknown]>([
		['not an object', []],
		['another version', { ...VALID, schemaVersion: 2 }],
		['an unknown property', { ...VALID, extra: 1 }],
		['no consolidation', { ...VALID, consolidation: undefined }],
		[
			'an unknown property of the consolidation',
			{ ...VALID, consolidation: { ...VALID.consolidation, extra: 1 } }
		],
		[
			'a negative number of keystrokes',
			{ ...VALID, consolidation: { ...VALID.consolidation, minRecentAttempts: -1 } }
		],
		[
			'a rate of mistakes of 1',
			{ ...VALID, consolidation: { ...VALID.consolidation, maxErrorRate: 1 } }
		],
		['no key to name', { ...VALID, consolidation: { ...VALID.consolidation, maxKeys: 0 } }],
		['no support', { ...VALID, support: null }],
		['an unknown property of the support', { ...VALID, support: { ...VALID.support, extra: 1 } }],
		[
			'no failed play before the help',
			{ ...VALID, support: { ...VALID.support, afterFailedPlays: 0 } }
		],
		['a negative margin', { ...VALID, support: { ...VALID.support, closeMargin: -1 } }],
		[
			'a level of words that does not exist',
			{ ...VALID, support: { ...VALID.support, wordLevel: 4 } }
		]
	])('refuses rules with %s', (_label, data) => {
		expect(() => parseResultRules(data)).toThrow();
	});
});
