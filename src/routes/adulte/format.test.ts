import { describe, expect, it } from 'vitest';
import { createFormatters } from './format';

const format = createFormatters('fr');

describe('createFormatters', () => {
	it('writes numbers with the decimal separator of the language, without grouping', () => {
		expect(format.number(12.345, 1)).toBe('12,3');
		expect(format.number(12345, 0)).toBe('12345');
	});

	it('writes the day a play was finished on the device then', () => {
		// 23:30 UTC is already the next day one hour east of UTC.
		expect(format.sessionDate(Date.parse('2026-11-05T23:30:00Z'), 60)).toBe('6 novembre 2026');
	});

	it('writes a day of the calendar whatever the time zone', () => {
		expect(format.day('2026-11-02')).toBe('2 novembre 2026');
	});

	it('joins a list as the language does', () => {
		expect(format.list(['A', 'B', 'C'])).toBe('A, B et C');
	});
});
