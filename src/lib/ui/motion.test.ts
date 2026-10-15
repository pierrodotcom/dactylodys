import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cubicBezierEasing, parseCssDuration, parseCubicBezier } from './motion';

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

describe('parseCubicBezier', () => {
	it('reads a curve as CSS writes it', () => {
		expect(parseCubicBezier('cubic-bezier(0.2, 0, 0, 1)')).toEqual([0.2, 0, 0, 1]);
		expect(parseCubicBezier(' cubic-bezier(0.3,0,1,1) ')).toEqual([0.3, 0, 1, 1]);
	});

	it.each([
		'',
		'ease',
		'cubic-bezier(1, 2, 3)',
		'cubic-bezier(2, 0, 0, 1)',
		'cubic-bezier(a, 0, 0, 1)'
	])('refuses %j', (value) => {
		expect(parseCubicBezier(value)).toBeNull();
	});
});

describe('cubicBezierEasing', () => {
	it('starts at 0 and ends at 1, whatever the curve', () => {
		fc.assert(
			fc.property(
				fc.double({ min: 0, max: 1, noNaN: true }),
				fc.double({ min: -1, max: 2, noNaN: true }),
				fc.double({ min: 0, max: 1, noNaN: true }),
				fc.double({ min: -1, max: 2, noNaN: true }),
				(x1, y1, x2, y2) => {
					const ease = cubicBezierEasing([x1, y1, x2, y2]);
					expect(ease(0)).toBe(0);
					expect(ease(1)).toBe(1);
				}
			)
		);
	});

	it('follows a straight line for the linear curve', () => {
		const linear = cubicBezierEasing([0, 0, 1, 1]);
		for (const time of [0.1, 0.25, 0.5, 0.9]) expect(linear(time)).toBeCloseTo(time, 5);
	});

	it('moves faster at first for a curve that slows down at the end', () => {
		const out = cubicBezierEasing([0, 0, 0, 1]);
		expect(out(0.25)).toBeGreaterThan(0.25);
		expect(out(0.5)).toBeGreaterThan(out(0.25));
	});
});
