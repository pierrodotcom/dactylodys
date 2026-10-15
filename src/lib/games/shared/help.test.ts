import { describe, expect, it } from 'vitest';
import { isLookReminderDue, needsCapsLockHelp } from './help';

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

describe('isLookReminderDue', () => {
	it('reminds every so many groups, between two groups only', () => {
		const due = [1, 2, 3, 4, 5, 6, 7, 8].map((completed) => isLookReminderDue(completed, 8, 4));
		expect(due).toEqual([false, false, false, true, false, false, false, false]);
	});

	it('never reminds before the first group, after the last one, or when turned off', () => {
		expect(isLookReminderDue(0, 8, 4)).toBe(false);
		expect(isLookReminderDue(8, 8, 4)).toBe(false);
		expect(isLookReminderDue(4, 8, 0)).toBe(false);
	});
});
