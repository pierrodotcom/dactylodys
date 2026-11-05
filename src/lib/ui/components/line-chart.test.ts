import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chartPoints, chartTicks, chartY, niceMax, type ChartFrame } from './line-chart';

const FRAME: ChartFrame = { width: 600, height: 200, left: 50, right: 10, top: 10, bottom: 10 };

describe('chartPoints', () => {
	it('spreads the values over the plot, the top value at the top', () => {
		expect(chartPoints([0, 50, 100], 100, FRAME)).toEqual([
			{ x: 50, y: 190 },
			{ x: 320, y: 100 },
			{ x: 590, y: 10 }
		]);
	});

	it('puts a single value in the middle', () => {
		expect(chartPoints([25], 100, FRAME)).toEqual([{ x: 320, y: 145 }]);
	});

	it('keeps every point inside the plot', () => {
		fc.assert(
			fc.property(
				fc.array(fc.double({ min: -100, max: 1000, noNaN: true }), { maxLength: 40 }),
				fc.double({ min: 0, max: 500, noNaN: true }),
				(values, max) => {
					for (const point of chartPoints(values, max, FRAME)) {
						expect(point.x).toBeGreaterThanOrEqual(FRAME.left);
						expect(point.x).toBeLessThanOrEqual(FRAME.width - FRAME.right);
						expect(point.y).toBeGreaterThanOrEqual(FRAME.top);
						expect(point.y).toBeLessThanOrEqual(FRAME.height - FRAME.bottom);
					}
				}
			)
		);
	});
});

describe('chartY', () => {
	it('puts 0 at the bottom of the plot', () => {
		expect(chartY(0, 20, FRAME)).toBe(190);
	});
});

describe('niceMax', () => {
	it.each([
		[0, 1],
		[0.4, 1],
		[3, 5],
		[12, 20],
		[20, 20],
		[51, 100]
	])('gives %d a scale up to %d', (value, max) => {
		expect(niceMax(value)).toBe(max);
	});

	it('always holds the value', () => {
		fc.assert(
			fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (value) => {
				expect(niceMax(value)).toBeGreaterThanOrEqual(value);
			})
		);
	});
});

describe('chartTicks', () => {
	it('writes 0, the middle and the top', () => {
		expect(chartTicks(20)).toEqual([0, 10, 20]);
	});
});
