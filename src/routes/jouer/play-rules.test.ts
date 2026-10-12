import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAY_RULES, parsePlayRules } from './play-rules';

const VALID = {
	schemaVersion: 1,
	breakAfterMinutes: 12,
	maxWordLevel: 3,
	bankLoadTimeoutMs: 3000,
	keyboardCheckCodes: ['KeyQ', 'KeyW']
};

describe('parsePlayRules', () => {
	it('accepts the shipped file', () => {
		const data: unknown = JSON.parse(readFileSync('content/common/play-rules.json', 'utf8'));

		expect(parsePlayRules(data)).toEqual(PLAY_RULES);
		expect(PLAY_RULES.keyboardCheckCodes.length).toBeGreaterThanOrEqual(3);
	});

	it('returns the rules as typed data', () => {
		expect(parsePlayRules(VALID)).toEqual({
			breakAfterMinutes: 12,
			maxWordLevel: 3,
			bankLoadTimeoutMs: 3000,
			keyboardCheckCodes: ['KeyQ', 'KeyW']
		});
	});

	it.each([
		['a non-object', 'rules'],
		['an unknown property', { ...VALID, extra: 1 }],
		['a wrong schema version', { ...VALID, schemaVersion: 2 }],
		['a zero break delay', { ...VALID, breakAfterMinutes: 0 }],
		['a delay that is not a number', { ...VALID, breakAfterMinutes: '12' }],
		['a level that does not exist', { ...VALID, maxWordLevel: 4 }],
		['no level', { ...VALID, maxWordLevel: undefined }],
		['no wait for the banks', { ...VALID, bankLoadTimeoutMs: 0 }],
		['a wait that is not a number', { ...VALID, bankLoadTimeoutMs: '3000' }],
		['no key to check', { ...VALID, keyboardCheckCodes: [] }],
		['an invalid key code', { ...VALID, keyboardCheckCodes: ['q'] }],
		['a duplicated key code', { ...VALID, keyboardCheckCodes: ['KeyQ', 'KeyQ'] }]
	])('rejects %s', (_name, data) => {
		expect(() => parsePlayRules(data)).toThrow();
	});
});
