import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAY_RULES, parsePlayRules } from './play-rules';

const VALID = {
	schemaVersion: 1,
	breakAfterMinutes: 12,
	breakAfterExercises: 4,
	maxWordLevel: 3,
	bankLoadTimeoutMs: 3000,
	ghostPaceFactor: 0.9,
	lookReminderEveryGroups: 4,
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
			breakAfterExercises: 4,
			maxWordLevel: 3,
			bankLoadTimeoutMs: 3000,
			ghostPaceFactor: 0.9,
			lookReminderEveryGroups: 4,
			keyboardCheckCodes: ['KeyQ', 'KeyW']
		});
	});

	it('reads the level of the words by age group and the length of the first ones', () => {
		const rules = parsePlayRules({
			...VALID,
			wordLevels: { '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] },
			shortWords: { beforeLesson: 12, maxLength: 7 }
		});
		expect(rules.wordLevels).toEqual({ '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] });
		expect(rules.shortWords).toEqual({ beforeLesson: 12, maxLength: 7 });
		expect(parsePlayRules(VALID)).not.toHaveProperty('wordLevels');
		expect(parsePlayRules(VALID)).not.toHaveProperty('shortWords');
	});

	it('ships easier words for the youngest, for longer (audit P-16)', () => {
		expect(PLAY_RULES.wordLevels).toEqual({ '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] });
		expect(PLAY_RULES.shortWords).toEqual({ beforeLesson: 12, maxLength: 7 });
	});

	it('can turn the reminder to look at the screen off', () => {
		expect(parsePlayRules({ ...VALID, lookReminderEveryGroups: 0 }).lookReminderEveryGroups).toBe(
			0
		);
	});

	it('lets the ghost run at the pace of the child, but never faster', () => {
		expect(parsePlayRules({ ...VALID, ghostPaceFactor: 1 }).ghostPaceFactor).toBe(1);
		expect(PLAY_RULES.ghostPaceFactor).toBeLessThanOrEqual(1);
	});

	it.each([
		['a non-object', 'rules'],
		['an unknown property', { ...VALID, extra: 1 }],
		['a wrong schema version', { ...VALID, schemaVersion: 2 }],
		['a negative number of exercises before a break', { ...VALID, breakAfterExercises: -1 }],
		['a zero break delay', { ...VALID, breakAfterMinutes: 0 }],
		['a delay that is not a number', { ...VALID, breakAfterMinutes: '12' }],
		['a level that does not exist', { ...VALID, maxWordLevel: 4 }],
		['no level', { ...VALID, maxWordLevel: undefined }],
		['levels for an unknown age group', { ...VALID, wordLevels: { '6-7': [1] } }],
		['levels that go down', { ...VALID, wordLevels: { '8-9': [2, 1] } }],
		['short words of no length', { ...VALID, shortWords: { beforeLesson: 12, maxLength: 0 } }],
		['no wait for the banks', { ...VALID, bankLoadTimeoutMs: 0 }],
		['a wait that is not a number', { ...VALID, bankLoadTimeoutMs: '3000' }],
		['a ghost that does not move', { ...VALID, ghostPaceFactor: 0 }],
		['a ghost faster than the child was', { ...VALID, ghostPaceFactor: 1.1 }],
		['a ghost pace that is not a number', { ...VALID, ghostPaceFactor: '0.9' }],
		['no ghost pace', { ...VALID, ghostPaceFactor: undefined }],
		['a negative reminder period', { ...VALID, lookReminderEveryGroups: -1 }],
		['a fractional reminder period', { ...VALID, lookReminderEveryGroups: 2.5 }],
		['no reminder period', { ...VALID, lookReminderEveryGroups: undefined }],
		['no key to check', { ...VALID, keyboardCheckCodes: [] }],
		['an invalid key code', { ...VALID, keyboardCheckCodes: ['q'] }],
		['a duplicated key code', { ...VALID, keyboardCheckCodes: ['KeyQ', 'KeyQ'] }]
	])('rejects %s', (_name, data) => {
		expect(() => parsePlayRules(data)).toThrow();
	});
});
