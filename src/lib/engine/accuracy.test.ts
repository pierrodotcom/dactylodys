import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeAccuracy } from './accuracy';

describe('computeAccuracy', () => {
	it('returns 100 when no keystroke has been made', () => {
		expect(computeAccuracy(0, 0)).toBe(100);
	});

	it('returns 100 when every keystroke is correct', () => {
		expect(computeAccuracy(12, 12)).toBe(100);
	});

	it('returns 0 when no keystroke is correct', () => {
		expect(computeAccuracy(0, 5)).toBe(0);
	});

	it('returns the percentage of correct keystrokes', () => {
		expect(computeAccuracy(3, 4)).toBe(75);
		expect(computeAccuracy(1, 3)).toBeCloseTo(33.333, 2);
	});

	it('rejects negative counts', () => {
		expect(() => computeAccuracy(-1, 5)).toThrow(RangeError);
		expect(() => computeAccuracy(0, -5)).toThrow(RangeError);
	});

	it('rejects non-integer counts', () => {
		expect(() => computeAccuracy(1.5, 5)).toThrow(RangeError);
		expect(() => computeAccuracy(1, 5.5)).toThrow(RangeError);
		expect(() => computeAccuracy(Number.NaN, 5)).toThrow(RangeError);
		expect(() => computeAccuracy(1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
	});

	it('rejects more correct keystrokes than total keystrokes', () => {
		expect(() => computeAccuracy(6, 5)).toThrow(RangeError);
	});

	const counts = fc
		.nat({ max: 100_000 })
		.chain((total) => fc.tuple(fc.nat({ max: total }), fc.constant(total)));

	it('always stays within 0 and 100', () => {
		fc.assert(
			fc.property(counts, ([correct, total]) => {
				const accuracy = computeAccuracy(correct, total);
				return accuracy >= 0 && accuracy <= 100;
			})
		);
	});

	it('returns 100 whenever correct equals total', () => {
		fc.assert(
			fc.property(fc.nat({ max: 100_000 }), (total) => computeAccuracy(total, total) === 100)
		);
	});

	it('is deterministic for the same inputs', () => {
		fc.assert(
			fc.property(counts, ([correct, total]) => {
				return computeAccuracy(correct, total) === computeAccuracy(correct, total);
			})
		);
	});

	it('increases when one more keystroke is correct', () => {
		fc.assert(
			fc.property(counts, ([correct, total]) => {
				fc.pre(correct < total);
				return computeAccuracy(correct + 1, total) > computeAccuracy(correct, total);
			})
		);
	});
});
