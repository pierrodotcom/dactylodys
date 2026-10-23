import { describe, expect, it } from 'vitest';
import { BLOCK_MARKS, blockLook, blockSize } from './blocks';
import { MATERIAL_OF_MARK, blockArt, blockDepth, latticeHoles, roundedPolygon } from './block-art';

/** Every point of a path: the radii and flags of its arcs are left out. */
function points(d: string): [number, number][] {
	const plain = d.replace(/A-?[\d.]+ -?[\d.]+ -?[\d.]+ [01] [01] /g, 'L');
	return [...plain.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => [
		Number(match[1]),
		Number(match[2])
	]);
}

describe('MATERIAL_OF_MARK', () => {
	it('gives every mark its own material', () => {
		const materials = BLOCK_MARKS.map((mark) => MATERIAL_OF_MARK[mark]);
		expect(new Set(materials).size).toBe(BLOCK_MARKS.length);
	});
});

describe('blockDepth', () => {
	it('stays a few units deep, whatever the number of blocks', () => {
		for (const total of [1, 5, 10, 13]) {
			const depth = blockDepth(blockSize(total));
			expect(depth.y).toBeGreaterThanOrEqual(3);
			expect(depth.y).toBeLessThanOrEqual(5);
			expect(depth.x).toBeGreaterThan(depth.y);
		}
	});
});

describe('blockArt', () => {
	it.each([5, 7, 10])('keeps every material of a %i-block tower inside its box', (total) => {
		const size = blockSize(total);
		const { x: dx, y: dy } = blockDepth(size);
		for (const mark of BLOCK_MARKS) {
			const art = blockArt(size, MATERIAL_OF_MARK[mark]);
			const all = [art.outline, art.top, art.side, art.low, art.rim, art.edges];
			const inside = all.concat(art.parts.filter((part) => !part.over).map((part) => part.d));
			for (const [x, y] of inside.flatMap(points)) {
				expect(x).toBeGreaterThanOrEqual(-size.width / 2 - 0.01);
				expect(x).toBeLessThanOrEqual(size.width / 2 + dx + 0.01);
				expect(y).toBeGreaterThanOrEqual(-size.height - dy - 0.01);
				expect(y).toBeLessThanOrEqual(0.01);
			}
		}
	});

	it('puts the studs of a toy brick on its top only', () => {
		const size = blockSize(6);
		const art = blockArt(size, 'plastic');
		const studs = art.parts.filter((part) => part.over).flatMap((part) => points(part.d));
		expect(studs.length).toBeGreaterThan(0);
		for (const [, y] of studs) expect(y).toBeLessThan(-size.height + 0.01);
	});

	it('draws the same block for the same group, always', () => {
		const size = blockSize(8);
		const look = blockLook(4);
		expect(blockArt(size, MATERIAL_OF_MARK[look.mark])).toEqual(
			blockArt(size, MATERIAL_OF_MARK[look.mark])
		);
	});
});

describe('roundedPolygon', () => {
	it('closes the shape and keeps a sharp corner sharp', () => {
		const d = roundedPolygon(
			[
				[0, 0],
				[10, 0],
				[10, 10]
			],
			[0, 2, 0]
		);
		expect(d.startsWith('M0 0')).toBe(true);
		expect(d.endsWith('Z')).toBe(true);
		expect(d.match(/Q/g)).toHaveLength(1);
	});
});

describe('latticeHoles', () => {
	it('opens one hole per bay, and one at each end', () => {
		expect(latticeHoles(0, 100, 0, 10, 8, 0.6)).toHaveLength(9);
	});
});
