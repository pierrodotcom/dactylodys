import { describe, expect, it } from 'vitest';
import {
	BLOCK_COLOURS,
	DROP_STAGES,
	FLAG_HEIGHT,
	GROUND_Y,
	HOVER_GAP,
	SCENE,
	TOWER_X,
	blockLook,
	blockSize,
	blockSpot,
	flagSpot,
	hoverOffset,
	starPoints
} from './blocks';

/** The speech bubble sits on the top band of the scene. */
const BUBBLE_BOTTOM = 45;

describe('blockSize', () => {
	it.each([5, 6, 7, 8, 9, 10])('keeps a whole tower of %i blocks inside the scene', (total) => {
		const size = blockSize(total);
		const top = blockSpot(total - 1, size).y - size.height;
		expect(top).toBeGreaterThan(0);
		const flag = flagSpot(total);
		expect(flag.y - FLAG_HEIGHT).toBeGreaterThanOrEqual(BUBBLE_BOTTOM);
		expect(blockSpot(0, size).y).toBe(GROUND_Y);
	});

	it('never leaves the bubble band, even with more blocks than planned', () => {
		for (const total of [1, 2, 3, 4, 11, 12, 13]) {
			const size = blockSize(total);
			expect(blockSpot(total - 1, size).y - size.height).toBeGreaterThan(BUBBLE_BOTTOM);
		}
	});

	it('makes the blocks thinner, never taller, as they get more numerous', () => {
		const heights = [3, 5, 7, 10].map((total) => blockSize(total).height);
		expect([...heights].sort((a, b) => b - a)).toEqual(heights);
	});

	it('fits the width of every block inside the scene', () => {
		for (const total of [1, 5, 10, 13]) {
			const { width } = blockSize(total);
			expect(TOWER_X + width / 2 + 10).toBeLessThan(SCENE.width);
			expect(TOWER_X - width / 2 - 10).toBeGreaterThan(0);
		}
	});
});

describe('blockLook', () => {
	it('is the same for the same group, whenever it is asked', () => {
		expect(blockLook(3)).toEqual(blockLook(3));
	});

	it('gives different looks to the first ten blocks', () => {
		const looks = Array.from({ length: 10 }, (_, index) => {
			const { colour, mark } = blockLook(index);
			return `${colour}-${mark}`;
		});
		expect(new Set(looks).size).toBe(looks.length);
	});

	it('uses a colour of the list for any index', () => {
		for (const index of [-3, 0, 5, 6, 99]) expect(BLOCK_COLOURS).toContain(blockLook(index).colour);
	});
});

describe('blockSpot', () => {
	it('stacks the blocks one on top of the other', () => {
		const size = blockSize(6);
		const [first, second] = [blockSpot(0, size), blockSpot(1, size)];
		expect(first?.y).toBe(GROUND_Y);
		expect((first?.y ?? 0) - (second?.y ?? 0)).toBe(size.height);
	});

	it('keeps the tower close to its axis', () => {
		const size = blockSize(10);
		for (let index = 0; index < 10; index++) {
			expect(Math.abs(blockSpot(index, size).x - TOWER_X)).toBeLessThanOrEqual(8);
		}
	});
});

describe('hoverOffset', () => {
	it('goes down by each step and keeps a gap above the place', () => {
		const offsets = Array.from({ length: DROP_STAGES + 1 }, (_, stage) => hoverOffset(stage));
		expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
		expect(new Set(offsets).size).toBe(offsets.length);
		expect(offsets[DROP_STAGES]).toBe(-HOVER_GAP);
	});

	it('stays inside the steps whatever it is given', () => {
		expect(hoverOffset(-4)).toBe(hoverOffset(0));
		expect(hoverOffset(DROP_STAGES + 7)).toBe(hoverOffset(DROP_STAGES));
	});
});

describe('starPoints', () => {
	it('draws ten points', () => {
		expect(starPoints(8).split(' ')).toHaveLength(10);
	});
});
