import { describe, expect, it } from 'vitest';
import { needsCapsLockHelp } from './help';

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
