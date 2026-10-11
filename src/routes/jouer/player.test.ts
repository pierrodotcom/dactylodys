import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfile, MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '$lib/state/profile';
import { checkPlayerName, platformFromUserAgent } from './player';

describe('checkPlayerName', () => {
	it('accepts a nickname and trims it', () => {
		expect(checkPlayerName('  Léa ')).toEqual({ ok: true, name: 'Léa' });
	});

	it('accepts from 1 to 20 characters', () => {
		expect(checkPlayerName('A')).toEqual({ ok: true, name: 'A' });
		expect(checkPlayerName('a'.repeat(20))).toEqual({ ok: true, name: 'a'.repeat(20) });
	});

	it('counts emoji and accented letters as one character each', () => {
		const name = 'é🦕'.repeat(10);

		expect(checkPlayerName(name)).toEqual({ ok: true, name });
	});

	it.each(['', '   ', '\t'])('asks for a nickname when it is empty (%j)', (raw) => {
		expect(checkPlayerName(raw)).toEqual({ ok: false, reason: 'empty' });
	});

	it('refuses more than 20 characters', () => {
		expect(checkPlayerName('a'.repeat(21))).toEqual({ ok: false, reason: 'invalid' });
	});

	it('refuses control characters', () => {
		expect(checkPlayerName('Lé\u0007a')).toEqual({ ok: false, reason: 'invalid' });
	});
});

function profileNameOrNull(raw: string): string | null {
	try {
		return createProfile({ id: 'probe', name: raw, now: 0, platform: 'pc' }).name;
	} catch {
		return null;
	}
}

describe('checkPlayerName and the profile contract', () => {
	it('uses the bounds exported by the profile contract', () => {
		expect(checkPlayerName('a'.repeat(MIN_NAME_LENGTH)).ok).toBe(true);
		expect(checkPlayerName('a'.repeat(MAX_NAME_LENGTH)).ok).toBe(true);
		expect(checkPlayerName('a'.repeat(MAX_NAME_LENGTH + 1))).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('agrees with createProfile on any text', () => {
		const samples = fc.oneof(
			fc.string({ unit: 'binary', maxLength: MAX_NAME_LENGTH + 5 }),
			fc.string({ unit: 'grapheme', maxLength: MAX_NAME_LENGTH + 5 }),
			fc.constantFrom('', ' ', '\u0007', ' Lé́a ', ' ﻿', '\u0085')
		);

		fc.assert(
			fc.property(samples, (raw) => {
				const check = checkPlayerName(raw);
				expect(check.ok ? check.name : null).toBe(profileNameOrNull(raw));
			})
		);
	});
});

describe('platformFromUserAgent', () => {
	it('recognises Apple computers', () => {
		expect(platformFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac');
	});

	it('defaults to a PC', () => {
		expect(platformFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('pc');
		expect(platformFromUserAgent('Mozilla/5.0 (X11; Linux x86_64)')).toBe('pc');
	});
});
