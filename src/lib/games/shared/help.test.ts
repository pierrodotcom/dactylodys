import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { lookReminderDue, needsCapsLockHelp } from './help';

describe('needsCapsLockHelp', () => {
	it('helps when Caps Lock is on and a lowercase letter is expected', () => {
		expect(needsCapsLockHelp(true, 'f')).toBe(true);
		expect(needsCapsLockHelp(true, 'é')).toBe(true);
	});

	it('stays quiet when Caps Lock is off', () => {
		expect(needsCapsLockHelp(false, 'f')).toBe(false);
	});

	it('stays quiet when a capital is expected, since Caps Lock would give the right character', () => {
		expect(needsCapsLockHelp(true, 'F')).toBe(false);
	});

	it('stays quiet for a space, a digit or a sign, which Caps Lock does not change', () => {
		for (const expected of [' ', '3', '!', '\n']) {
			expect(needsCapsLockHelp(true, expected)).toBe(false);
		}
	});

	it('stays quiet when nothing is expected', () => {
		expect(needsCapsLockHelp(true, undefined)).toBe(false);
	});
});

describe('lookReminderDue (audit P-20)', () => {
	const RULE = { firstAfterChars: 20, everyChars: 40 };
	const dueAfter = (lengths: readonly number[]) =>
		lengths.map((_, index) => lookReminderDue(lengths, index + 1, RULE));

	it('reminds once the first characters are typed, between two groups', () => {
		// Eight groups of five characters: 20 typed after the fourth.
		expect(dueAfter([5, 5, 5, 5, 5, 5, 5, 5])).toEqual([
			null,
			null,
			null,
			0,
			null,
			null,
			null,
			null
		]);
	});

	it('reminds in a play of three or four long groups too, which counting groups missed', () => {
		expect(dueAfter([12, 12, 12])).toEqual([null, 0, null]);
		expect(dueAfter([10, 11, 12, 10])).toEqual([null, 0, null, null]);
	});

	it('comes back every so many characters in a long play, numbering its reminders', () => {
		// Twelve groups of twelve characters: 20, 60 and 100 typed during the 2nd, 5th and 9th.
		const long = Array.from({ length: 12 }, () => 12);
		expect(dueAfter(long)).toEqual([null, 0, null, null, 1, null, null, null, 2, null, null, null]);
	});

	it('never reminds before the first group, after the last one, or without a rule', () => {
		expect(lookReminderDue([30, 30], 0, RULE)).toBeNull();
		expect(lookReminderDue([10, 30], 2, RULE)).toBeNull();
		expect(lookReminderDue([30, 30], 1, undefined)).toBeNull();
	});

	it('reminds at most once between two groups, and in order', () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 1, max: 60 }), { minLength: 1, maxLength: 12 }),
				fc.integer({ min: 1, max: 50 }),
				fc.integer({ min: 1, max: 50 }),
				(lengths, firstAfterChars, everyChars) => {
					const rule = { firstAfterChars, everyChars };
					const due = lengths
						.map((_, index) => lookReminderDue(lengths, index + 1, rule))
						.filter((index) => index !== null);
					due.forEach((index, order) => expect(index).toBeGreaterThanOrEqual(order));
					expect(new Set(due).size).toBe(due.length);
					expect(lookReminderDue(lengths, lengths.length, rule)).toBeNull();
				}
			)
		);
	});
});
