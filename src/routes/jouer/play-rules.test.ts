import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lessonIds, parseProgression } from '$lib/engine/progression/definition';
import { PLAY_RULES, parsePlayRules } from './play-rules';

const SESSION_LENGTHS = {
	short: { typingMinutes: 5, clockMinutes: 8, earlyExercises: 4, exercises: 4 },
	normal: { typingMinutes: 8, clockMinutes: 12, earlyExercises: 4, exercises: 0 },
	long: { typingMinutes: 12, clockMinutes: 15, earlyExercises: 6, exercises: 0 }
};

/** The valid rules with one field of one length of session changed. */
function withLength(name: keyof typeof SESSION_LENGTHS, change: Record<string, unknown>) {
	return {
		...VALID,
		sessionLengths: { ...SESSION_LENGTHS, [name]: { ...SESSION_LENGTHS[name], ...change } }
	};
}

const VALID = {
	schemaVersion: 1,
	sessionLengths: SESSION_LENGTHS,
	earlyWorlds: 2,
	maxWordLevel: 3,
	bankLoadTimeoutMs: 3000,
	ghostPaceFactor: 0.9,
	lookReminder: { firstAfterChars: 20, everyChars: 40 },
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
			sessionLengths: SESSION_LENGTHS,
			earlyWorlds: 2,
			maxWordLevel: 3,
			bankLoadTimeoutMs: 3000,
			ghostPaceFactor: 0.9,
			lookReminder: { firstAfterChars: 20, everyChars: 40 },
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
		expect(PLAY_RULES.shortWords).toEqual({ beforeLesson: 14, maxLength: 7 });
		// Short words over the two first worlds, their grand tours included: up to the third world.
		const progression = parseProgression(
			JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
		);
		const third = progression.worlds[2]?.lessons[0]?.id;
		expect(lessonIds(progression)[(PLAY_RULES.shortWords?.beforeLesson ?? 0) - 1]).toBe(third);
	});

	it('reminds to look at the screen after so many characters typed (audit P-20)', () => {
		const lookReminder = { firstAfterChars: 4, everyChars: 7 };
		expect(parsePlayRules({ ...VALID, lookReminder }).lookReminder).toEqual(lookReminder);
		// Once in a play of the length of a lesson (35 characters), even in three or four groups.
		expect(PLAY_RULES.lookReminder.firstAfterChars).toBeLessThan(35);
	});

	it('lets the ghost run at the pace of the child, but never faster', () => {
		expect(parsePlayRules({ ...VALID, ghostPaceFactor: 1 }).ghostPaceFactor).toBe(1);
		expect(PLAY_RULES.ghostPaceFactor).toBeLessThanOrEqual(1);
	});

	it.each([
		['a non-object', 'rules'],
		['an unknown property', { ...VALID, extra: 1 }],
		['a wrong schema version', { ...VALID, schemaVersion: 2 }],
		['a negative number of exercises before a break', withLength('normal', { exercises: -1 })],
		['half an exercise before a break', withLength('normal', { earlyExercises: 2.5 })],
		['a zero break delay', withLength('normal', { clockMinutes: 0 })],
		['a delay that is not a number', withLength('normal', { clockMinutes: '12' })],
		['no time spent typing', withLength('normal', { typingMinutes: 0 })],
		['a ceiling under the time spent typing', withLength('normal', { clockMinutes: 7 })],
		['an unknown property of a length', withLength('normal', { extra: 1 })],
		['a long session shorter than the normal one', withLength('long', { typingMinutes: 6 })],
		['a short session with a higher ceiling', withLength('short', { clockMinutes: 13 })],
		['a missing length', { ...VALID, sessionLengths: { normal: SESSION_LENGTHS.normal } }],
		[
			'an unknown length',
			{ ...VALID, sessionLengths: { ...SESSION_LENGTHS, huge: SESSION_LENGTHS.long } }
		],
		['no lengths', { ...VALID, sessionLengths: undefined }],
		['a negative number of first worlds', { ...VALID, earlyWorlds: -1 }],
		['no number of first worlds', { ...VALID, earlyWorlds: undefined }],
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
		[
			'a reminder before any character',
			{ ...VALID, lookReminder: { firstAfterChars: 0, everyChars: 40 } }
		],
		[
			'a fractional reminder period',
			{ ...VALID, lookReminder: { firstAfterChars: 20, everyChars: 2.5 } }
		],
		[
			'an unknown property of the reminder',
			{ ...VALID, lookReminder: { firstAfterChars: 20, everyChars: 40, everyGroups: 4 } }
		],
		['no reminder', { ...VALID, lookReminder: undefined }],
		['the old reminder counted in groups', { ...VALID, lookReminderEveryGroups: 4 }],
		['no key to check', { ...VALID, keyboardCheckCodes: [] }],
		['an invalid key code', { ...VALID, keyboardCheckCodes: ['q'] }],
		['a duplicated key code', { ...VALID, keyboardCheckCodes: ['KeyQ', 'KeyQ'] }]
	])('rejects %s', (_name, data) => {
		expect(() => parsePlayRules(data)).toThrow();
	});
});
