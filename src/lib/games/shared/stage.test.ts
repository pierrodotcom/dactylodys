import { describe, expect, it } from 'vitest';
import { groupRatio, stageFor } from './stage';

describe('stageFor', () => {
	it('shows nothing before the first good key', () => {
		expect(stageFor(0, 4, 4)).toBe(0);
	});

	it('shows more steps as the group advances', () => {
		const stages = [1, 2, 3].map((position) => stageFor(position, 4, 4));

		expect(stages).toEqual([1, 2, 3]);
	});

	it('shows a step after the first good key, even in a short group', () => {
		expect(stageFor(1, 2, 4)).toBeGreaterThan(0);
	});

	it('shows every step once the group is complete', () => {
		for (const length of [1, 2, 3, 7, 30]) {
			expect(stageFor(length, length, 4)).toBe(4);
		}
	});

	it('never exceeds the number of steps, and never goes down', () => {
		for (const length of [2, 3, 5, 9]) {
			let previous = 0;
			for (let position = 0; position <= length; position++) {
				const stage = stageFor(position, length, 4);
				expect(stage).toBeLessThanOrEqual(4);
				expect(stage).toBeGreaterThanOrEqual(previous);
				previous = stage;
			}
		}
	});

	it('handles an empty group', () => {
		expect(stageFor(0, 0, 4)).toBe(0);
	});
});

describe('groupRatio', () => {
	it('goes from 0 to 1 with one notch per good key', () => {
		const ratios = [0, 1, 2, 3, 4].map((position) => groupRatio(position, 4));

		expect(ratios).toEqual([0, 0.25, 0.5, 0.75, 1]);
	});

	it('stays between 0 and 1', () => {
		expect(groupRatio(-1, 4)).toBe(0);
		expect(groupRatio(9, 4)).toBe(1);
		expect(groupRatio(0, 0)).toBe(0);
	});
});
