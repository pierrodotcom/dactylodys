import { describe, expect, it } from 'vitest';
import { parseCssDuration } from './duration';

describe('parseCssDuration', () => {
	it.each([
		['500ms', 500],
		['1ms', 1],
		['0.5s', 500],
		['2s', 2000],
		['.25s', 250],
		[' 150ms ', 150]
	])('reads %s as %d ms', (value, expected) => {
		expect(parseCssDuration(value)).toBe(expected);
	});

	it.each(['', 'fast', '500', '10px', 'ms', '-5ms'])('refuses %j', (value) => {
		expect(parseCssDuration(value)).toBeNull();
	});
});
