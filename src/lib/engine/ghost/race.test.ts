import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ghostProgress, parseGhostRun, toGhostRun } from './ghost';
import { ghostFinishMs, ghostShare, raceWinner, slowGhostRun } from './race';
import type { GhostRun, PacePoint } from './types';

const RUN: GhostRun = {
	recordedAt: 1_700_000_000_000,
	charCount: 20,
	activeMs: 4000,
	points: [
		{ correctChars: 5, activeMs: 1000 },
		{ correctChars: 10, activeMs: 3000 },
		{ correctChars: 20, activeMs: 4000 }
	]
};

const runArb: fc.Arbitrary<GhostRun> = fc
	.array(
		fc.record({ chars: fc.integer({ min: 0, max: 60 }), ms: fc.integer({ min: 0, max: 60_000 }) }),
		{
			minLength: 1,
			maxLength: 30
		}
	)
	.map((steps) => {
		let correctChars = 0;
		let activeMs = 0;
		const points: PacePoint[] = steps.map((step) => {
			correctChars += step.chars;
			activeMs += step.ms;
			return { correctChars, activeMs };
		});
		return toGhostRun(points, 0);
	})
	.filter((run): run is GhostRun => run !== null);

const charCountArb = fc.integer({ min: 1, max: 200 });
const paceFactorArb = fc.double({ min: 0.05, max: 1, noNaN: true });
const elapsedArb = fc.double({ min: -1000, max: 5_000_000, noNaN: true });

describe('ghostFinishMs', () => {
	it('takes the recorded time, slowed down, for an exercise of the recorded length', () => {
		expect(ghostFinishMs(RUN, 20, 0.8)).toBe(5000);
	});

	it('keeps the rhythm of the recorded run on a longer or shorter exercise', () => {
		expect(ghostFinishMs(RUN, 40, 1)).toBe(8000);
		expect(ghostFinishMs(RUN, 10, 1)).toBe(2000);
	});

	it('refuses an empty exercise and a pace that is not positive', () => {
		expect(() => ghostFinishMs(RUN, 0, 1)).toThrow(RangeError);
		expect(() => ghostFinishMs(RUN, 2.5, 1)).toThrow(RangeError);
		expect(() => ghostFinishMs(RUN, 20, 0)).toThrow(RangeError);
		expect(() => ghostFinishMs(RUN, 20, Number.NaN)).toThrow(RangeError);
	});
});

describe('ghostShare', () => {
	it('is the recorded progress on an exercise of the recorded length', () => {
		expect(ghostShare(RUN, 1000, 20, 1)).toBe(ghostProgress(RUN, 1000, 1));
		expect(ghostShare(RUN, 2000, 20, 1)).toBe(0.375);
	});

	it('stretches the recorded progress over a longer exercise', () => {
		expect(ghostShare(RUN, 2000, 40, 1)).toBe(0.25);
		expect(ghostShare(RUN, 8000, 40, 1)).toBe(1);
	});

	it('stays in [0, 1], never goes back, and reaches 1 exactly at the finish time', () => {
		fc.assert(
			fc.property(
				runArb,
				charCountArb,
				paceFactorArb,
				elapsedArb,
				elapsedArb,
				(run, charCount, factor, a, b) => {
					const [early, late] = a <= b ? [a, b] : [b, a];
					const first = ghostShare(run, early, charCount, factor);
					const second = ghostShare(run, late, charCount, factor);
					expect(first).toBeGreaterThanOrEqual(0);
					expect(second).toBeLessThanOrEqual(1);
					expect(second).toBeGreaterThanOrEqual(first);
					expect(ghostShare(run, ghostFinishMs(run, charCount, factor), charCount, factor)).toBe(1);
				}
			)
		);
	});
});

describe('raceWinner', () => {
	it('gives the race to the child who is done before the ghost, and a tie too', () => {
		expect(raceWinner(RUN, 4999, 20, 0.8)).toBe('child');
		expect(raceWinner(RUN, 5000, 20, 0.8)).toBe('child');
		expect(raceWinner(RUN, 5001, 20, 0.8)).toBe('ghost');
	});

	it('lets a child typing exactly like the recorded run arrive first, since the ghost is slowed down', () => {
		fc.assert(
			fc.property(runArb, paceFactorArb, (run, factor) => {
				expect(raceWinner(run, run.activeMs, run.charCount, factor)).toBe('child');
			})
		);
	});
});

describe('slowGhostRun', () => {
	it('stretches every time of the run', () => {
		expect(slowGhostRun(RUN, 0.8)).toEqual({
			...RUN,
			activeMs: 5000,
			points: [
				{ correctChars: 5, activeMs: 1250 },
				{ correctChars: 10, activeMs: 3750 },
				{ correctChars: 20, activeMs: 5000 }
			]
		});
	});

	it('gives a run that can be stored and raced like the recorded one, slowed down', () => {
		fc.assert(
			fc.property(runArb, paceFactorArb, (run, factor) => {
				const slow = slowGhostRun(run, factor);
				expect(parseGhostRun(slow)).toEqual(slow);
				expect(
					Math.abs(ghostFinishMs(slow, run.charCount, 1) - run.activeMs / factor)
				).toBeLessThanOrEqual(0.5);
			})
		);
	});

	it('refuses a pace that is not positive', () => {
		expect(() => slowGhostRun(RUN, 0)).toThrow(RangeError);
	});
});
