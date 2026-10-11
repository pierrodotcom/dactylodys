import { describe, expect, it } from 'vitest';
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

describe('platformFromUserAgent', () => {
	it('recognises Apple computers', () => {
		expect(platformFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac');
	});

	it('defaults to a PC', () => {
		expect(platformFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('pc');
		expect(platformFromUserAgent('Mozilla/5.0 (X11; Linux x86_64)')).toBe('pc');
	});
});
