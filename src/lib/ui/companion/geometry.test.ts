import { describe, expect, it } from 'vitest';
import {
	checkerPath,
	ellipseBand,
	ellipseHalfWidth,
	fluffPath,
	pointOnCubic,
	roundedStarPath,
	squareViewBox,
	starPath,
	stitchesAlong
} from './geometry';

function numbersOf(path: string): number[] {
	return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('starPath', () => {
	it('draws two corners per tip, the first tip pointing up', () => {
		const path = starPath(60, 50, 10, 4);
		expect(path.match(/[ML]/g)).toHaveLength(10);
		expect(path.startsWith('M60 40L')).toBe(true);
		expect(path.endsWith('Z')).toBe(true);
	});

	it('keeps every corner within the outer radius', () => {
		const values = numbersOf(starPath(0, 0, 10, 4, 7));
		for (let i = 0; i < values.length; i += 2) {
			expect(Math.hypot(values[i] ?? 0, values[i + 1] ?? 0)).toBeLessThanOrEqual(10.01);
		}
	});
});

describe('roundedStarPath', () => {
	it('bends every corner into a curve, inside the outer radius', () => {
		const path = roundedStarPath(0, 0, 10, 4, 5, 0.2);
		expect(path.match(/Q/g)).toHaveLength(10);
		const values = numbersOf(path);
		for (let i = 0; i < values.length; i += 2) {
			expect(Math.hypot(values[i] ?? 0, values[i + 1] ?? 0)).toBeLessThanOrEqual(10.01);
		}
	});

	it('keeps the tip pointing up as the control point of the first curve', () => {
		expect(roundedStarPath(60, 50, 10, 4)).toContain('Q60 40 ');
	});
});

describe('fluffPath', () => {
	it('draws one bulging arc per bump, starting at the top', () => {
		const path = fluffPath(0, 0, 10, 8, 1);
		expect(path.startsWith('M0 -10Q')).toBe(true);
		expect(path.match(/Q/g)).toHaveLength(8);
	});
});

describe('pointOnCubic', () => {
	it('goes from the first point to the last one', () => {
		const curve = [
			[0, 0],
			[10, 0],
			[10, 10],
			[20, 10]
		] as const;
		expect(pointOnCubic(curve, 0)).toEqual([0, 0]);
		expect(pointOnCubic(curve, 1)).toEqual([20, 10]);
		expect(pointOnCubic(curve, 0.5)).toEqual([10, 5]);
	});
});

describe('stitchesAlong', () => {
	it('draws the given number of separate dashes', () => {
		const path = stitchesAlong(
			[
				[0, 0],
				[0, 0],
				[30, 0],
				[30, 0]
			],
			3
		);
		expect(path.match(/M/g)).toHaveLength(3);
		expect(path.match(/L/g)).toHaveLength(3);
	});
});

describe('checkerPath', () => {
	it('fills one square out of two, starting at the top left', () => {
		const path = checkerPath(0, 0, 3, 2, 5);
		expect(path).toBe('M0 0h5v5h-5ZM10 0h5v5h-5ZM5 5h5v5h-5Z');
	});
});

describe('ellipseHalfWidth', () => {
	it('is the radius at the centre and zero at the top and outside', () => {
		expect(ellipseHalfWidth(50, 20, 10, 50)).toBe(20);
		expect(ellipseHalfWidth(50, 20, 10, 40)).toBe(0);
		expect(ellipseHalfWidth(50, 20, 10, 70)).toBe(0);
	});
});

describe('ellipseBand', () => {
	it('spans the ellipse between both heights', () => {
		expect(ellipseBand(60, 50, 20, 10, 50, 50)).toBe('M40 50L80 50L80 50L40 50Z');
		const [left, top] = numbersOf(ellipseBand(60, 50, 20, 10, 44, 56));
		expect(top).toBe(44);
		expect(left).toBeCloseTo(60 - 16, 5);
	});
});

describe('squareViewBox', () => {
	it('centres a frame in a square with a margin', () => {
		expect(squareViewBox([10, 20, 40, 20], 5)).toBe('5 5 50 50');
		expect(squareViewBox([-20, -30, 20, 30], 0)).toBe('-25 -30 30 30');
	});
});
