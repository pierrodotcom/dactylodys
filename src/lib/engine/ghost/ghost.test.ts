import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { SessionMetrics } from '../types';
import { ghostProgress, pacePoints, parseGhostRun, toGhostRun } from './ghost';
import type { GhostRun, PacePoint } from './types';

const REMOVE = Symbol('remove');

function metrics(correctKeystrokes: number, elapsedMs: number): SessionMetrics {
	return {
		elapsedMs,
		totalKeystrokes: correctKeystrokes,
		correctKeystrokes,
		errorCount: 0,
		accuracy: 100,
		correctCharsPerMinute: 0,
		wordsPerMinute: 0,
		perChar: {}
	};
}

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

const stepArb = fc.record({
	chars: fc.integer({ min: 0, max: 60 }),
	ms: fc.integer({ min: 0, max: 60_000 })
});

const pointsArb: fc.Arbitrary<PacePoint[]> = fc
	.array(stepArb, { minLength: 1, maxLength: 30 })
	.map((steps) => {
		let correctChars = 0;
		let activeMs = 0;
		return steps.map((step) => {
			correctChars += step.chars;
			activeMs += step.ms;
			return { correctChars, activeMs };
		});
	});

const runArb: fc.Arbitrary<GhostRun> = pointsArb
	.map((points) => toGhostRun(points, 0))
	.filter((run): run is GhostRun => run !== null);

const paceFactorArb = fc.double({ min: 0.05, max: 1, noNaN: true });
const elapsedArb = fc.double({ min: -1000, max: 5_000_000, noNaN: true });

describe('pacePoints', () => {
	it('cumulates the correct keystrokes and the durations of the groups', () => {
		expect(pacePoints([metrics(4, 1200), metrics(1, 0), metrics(6, 2500.5)])).toEqual([
			{ correctChars: 4, activeMs: 1200 },
			{ correctChars: 5, activeMs: 1200 },
			{ correctChars: 11, activeMs: 3700.5 }
		]);
	});

	it('gives no point for no group', () => {
		expect(pacePoints([])).toEqual([]);
	});
});

describe('toGhostRun', () => {
	it('keeps the points and sums up the run with its last point', () => {
		expect(toGhostRun(RUN.points, RUN.recordedAt)).toEqual(RUN);
	});

	it('rounds the times to whole milliseconds', () => {
		const run = toGhostRun(
			[
				{ correctChars: 3, activeMs: 800.4 },
				{ correctChars: 7, activeMs: 2100.6 }
			],
			5
		);
		expect(run).toEqual({
			recordedAt: 5,
			charCount: 7,
			activeMs: 2101,
			points: [
				{ correctChars: 3, activeMs: 800 },
				{ correctChars: 7, activeMs: 2101 }
			]
		});
	});

	it('does not keep the array it was given', () => {
		const points = [{ correctChars: 3, activeMs: 800 }];
		const run = toGhostRun(points, 0);
		expect(run?.points).not.toBe(points);
		expect(run?.points[0]).not.toBe(points[0]);
	});

	it.each<[string, PacePoint[]]>([
		['no point', []],
		['no character typed', [{ correctChars: 0, activeMs: 900 }]],
		['no time spent', [{ correctChars: 6, activeMs: 0 }]],
		['a time that rounds to nothing', [{ correctChars: 6, activeMs: 0.2 }]],
		[
			'a count that goes down',
			[
				{ correctChars: 6, activeMs: 100 },
				{ correctChars: 5, activeMs: 200 }
			]
		],
		[
			'a time that goes down',
			[
				{ correctChars: 6, activeMs: 200 },
				{ correctChars: 8, activeMs: 100 }
			]
		],
		['a fractional count', [{ correctChars: 2.5, activeMs: 100 }]],
		['a negative count', [{ correctChars: -1, activeMs: 100 }]],
		['a time that is not a number', [{ correctChars: 3, activeMs: Number.NaN }]],
		['an endless time', [{ correctChars: 3, activeMs: Number.POSITIVE_INFINITY }]]
	])('gives nothing for %s', (_label, points) => {
		expect(toGhostRun(points, 0)).toBeNull();
	});

	it('gives nothing for a date that is not a timestamp', () => {
		expect(toGhostRun(RUN.points, -1)).toBeNull();
		expect(toGhostRun(RUN.points, 1.5)).toBeNull();
	});

	it('always gives a run that the parser accepts', () => {
		fc.assert(
			fc.property(pointsArb, fc.nat(), (points, recordedAt) => {
				const run = toGhostRun(points, recordedAt);
				if (run === null) return;
				expect(parseGhostRun(JSON.parse(JSON.stringify(run)))).toEqual(run);
			})
		);
	});
});

describe('ghostProgress', () => {
	it('starts at nothing', () => {
		expect(ghostProgress(RUN, 0, 1)).toBe(0);
	});

	it('stays at nothing before the start', () => {
		expect(ghostProgress(RUN, -500, 1)).toBe(0);
		expect(ghostProgress(RUN, Number.NaN, 1)).toBe(0);
	});

	it('is at the share of each point at the time of that point', () => {
		expect(ghostProgress(RUN, 1000, 1)).toBeCloseTo(0.25);
		expect(ghostProgress(RUN, 3000, 1)).toBeCloseTo(0.5);
	});

	it('moves in a straight line between two points', () => {
		expect(ghostProgress(RUN, 500, 1)).toBeCloseTo(0.125);
		expect(ghostProgress(RUN, 2000, 1)).toBeCloseTo(0.375);
		expect(ghostProgress(RUN, 3500, 1)).toBeCloseTo(0.75);
	});

	it('is done at the end of the run and stays done', () => {
		expect(ghostProgress(RUN, 4000, 1)).toBe(1);
		expect(ghostProgress(RUN, 90_000, 1)).toBe(1);
		expect(ghostProgress(RUN, Number.POSITIVE_INFINITY, 1)).toBe(1);
	});

	it('is slower with a pace factor under 1', () => {
		expect(ghostProgress(RUN, 1000, 0.5)).toBeCloseTo(0.125);
		expect(ghostProgress(RUN, 4000, 0.5)).toBeCloseTo(0.375);
		expect(ghostProgress(RUN, 8000, 0.5)).toBe(1);
	});

	it('jumps over a group that took no time', () => {
		const run = toGhostRun(
			[
				{ correctChars: 4, activeMs: 1000 },
				{ correctChars: 5, activeMs: 1000 },
				{ correctChars: 10, activeMs: 2000 }
			],
			0
		) as GhostRun;
		expect(ghostProgress(run, 999, 1)).toBeLessThan(0.4);
		expect(ghostProgress(run, 1000, 1)).toBeCloseTo(0.5);
	});

	it.each([0, -0.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'refuses the pace factor %s',
		(paceFactor) => {
			expect(() => ghostProgress(RUN, 100, paceFactor)).toThrow(RangeError);
		}
	);

	it('stays between 0 and 1', () => {
		fc.assert(
			fc.property(runArb, elapsedArb, paceFactorArb, (run, elapsedMs, paceFactor) => {
				const progress = ghostProgress(run, elapsedMs, paceFactor);
				expect(progress).toBeGreaterThanOrEqual(0);
				expect(progress).toBeLessThanOrEqual(1);
			})
		);
	});

	it('never goes back as time passes', () => {
		fc.assert(
			fc.property(runArb, elapsedArb, elapsedArb, paceFactorArb, (run, a, b, paceFactor) => {
				const [earlier, later] = a <= b ? [a, b] : [b, a];
				expect(ghostProgress(run, earlier, paceFactor)).toBeLessThanOrEqual(
					ghostProgress(run, later, paceFactor)
				);
			})
		);
	});

	it('is done exactly when the slowed run is over', () => {
		fc.assert(
			fc.property(runArb, paceFactorArb, (run, paceFactor) => {
				expect(ghostProgress(run, run.activeMs / paceFactor, paceFactor)).toBe(1);
			})
		);
	});

	it('is never ahead of a slower ghost', () => {
		fc.assert(
			fc.property(runArb, elapsedArb, paceFactorArb, (run, elapsedMs, paceFactor) => {
				expect(ghostProgress(run, elapsedMs, paceFactor)).toBeLessThanOrEqual(
					ghostProgress(run, elapsedMs, 1)
				);
			})
		);
	});

	it('gives the same answer to the same question', () => {
		fc.assert(
			fc.property(runArb, elapsedArb, paceFactorArb, (run, elapsedMs, paceFactor) => {
				const copy = structuredClone(run);
				expect(ghostProgress(copy, elapsedMs, paceFactor)).toBe(
					ghostProgress(run, elapsedMs, paceFactor)
				);
				expect(copy).toEqual(run);
			})
		);
	});
});

describe('parseGhostRun', () => {
	type Json = Record<string, unknown>;

	function mutate(path: readonly (string | number)[], value: unknown): unknown {
		const data = structuredClone(RUN) as unknown as Json;
		let target: Json = data;
		for (const key of path.slice(0, -1)) target = target[key] as Json;
		const last = path[path.length - 1] ?? '';
		if (value === REMOVE) delete target[last];
		else target[last] = value;
		return data;
	}

	it('accepts a valid run and returns an equal copy', () => {
		const parsed = parseGhostRun(structuredClone(RUN));
		expect(parsed).toEqual(RUN);
		expect(parsed.points).not.toBe(RUN.points);
	});

	it('names the place of what it refuses', () => {
		expect(() => parseGhostRun(mutate(['points', 1, 'activeMs'], -1), 'profile.ghosts.x')).toThrow(
			/^profile\.ghosts\.x\.points\[1\]\.activeMs: /
		);
	});

	it.each([null, 'run', 3, []])('rejects %j', (data) => {
		expect(() => parseGhostRun(data)).toThrow(/ghost: expected an object/);
	});

	it.each<[string, (string | number)[], unknown, RegExp]>([
		['an unknown property', ['text'], 'abc', /ghost\.text/],
		['a missing date', ['recordedAt'], REMOVE, /recordedAt/],
		['a negative date', ['recordedAt'], -1, /recordedAt/],
		['a fractional date', ['recordedAt'], 0.5, /recordedAt/],
		['no character', ['charCount'], 0, /charCount/],
		['a count that is not the last one', ['charCount'], 19, /charCount/],
		['no time', ['activeMs'], 0, /activeMs/],
		['a time that is not the last one', ['activeMs'], 4001, /activeMs/],
		['points that are not a list', ['points'], {}, /points/],
		['no point', ['points'], [], /points/],
		['a point that is not an object', ['points', 0], 5, /points\[0\]/],
		['a point with an unknown property', ['points', 0, 'speed'], 1, /points\[0\]\.speed/],
		['a point without its count', ['points', 0, 'correctChars'], REMOVE, /correctChars/],
		['a fractional count', ['points', 0, 'correctChars'], 4.5, /correctChars/],
		['a count as text', ['points', 0, 'correctChars'], '5', /correctChars/],
		['a fractional time', ['points', 0, 'activeMs'], 999.5, /activeMs/],
		['a count that goes down', ['points', 1, 'correctChars'], 4, /points\[1\]\.correctChars/],
		['a time that goes down', ['points', 1, 'activeMs'], 999, /points\[1\]\.activeMs/]
	])('rejects %s', (_label, path, value, message) => {
		expect(() => parseGhostRun(mutate(path, value))).toThrow(message);
	});

	it('rejects any arbitrary value', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(() => parseGhostRun(data)).toThrow();
			})
		);
	});
});
