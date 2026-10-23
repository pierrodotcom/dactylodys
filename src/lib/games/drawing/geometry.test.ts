import { describe, expect, it } from 'vitest';
import {
	ellipsePath,
	mirrorPath,
	parsePath,
	pathLength,
	regionOf,
	rotatePath,
	shiftPath,
	subpaths,
	visiblePieces
} from './geometry';
import { DRAWINGS, paintOrder } from './shapes';

const SQUARE = 'M0 0L10 0L10 10L0 10Z';

describe('paths of the drawings', () => {
	it('refuse relative commands and arcs, which could not be moved', () => {
		expect(() => parsePath('M0 0l10 0')).toThrow();
		expect(() => parsePath('M0 0A5 5 0 0 1 10 0')).toThrow();
	});

	it('move, mirror and turn every point', () => {
		expect(shiftPath('M1 2L3 4', 10, 20)).toBe('M11 22L13 24');
		expect(mirrorPath('M90 0L80 5')).toBe('M110 0L120 5');
		expect(rotatePath('M10 0', 90, 0, 0)).toBe('M0 10');
	});

	it('measure lines and ellipses', () => {
		expect(pathLength(SQUARE)).toBeCloseTo(40, 5);
		expect(pathLength(ellipsePath(0, 0, 10, 10))).toBeCloseTo(2 * Math.PI * 10, 0);
	});

	it('split into subpaths, each starting with M', () => {
		expect(subpaths('M0 0L1 1M5 5L6 6')).toEqual(['M0 0L1 1', 'M5 5L6 6']);
	});
});

describe('visiblePieces', () => {
	it('keeps a line that nothing covers as it is', () => {
		expect(visiblePieces('M0 0L20 0', [], 1)).toEqual([{ d: 'M0 0L20 0', length: 20, cut: false }]);
	});

	it('stops a line at the outline of the form painted over it', () => {
		const pieces = visiblePieces('M0 5L30 5', [regionOf('M10 0L20 0L20 10L10 10Z')], 1);

		expect(pieces).toHaveLength(2);
		expect(pieces.every((piece) => piece.cut)).toBe(true);
		const visible = pieces.reduce((sum, piece) => sum + piece.length, 0);
		expect(visible).toBeGreaterThan(19);
		expect(visible).toBeLessThan(22.5);
	});

	it('joins the two ends of a closed line cut away from its start', () => {
		const ring = 'M0 0L20 0L20 20L0 20Z';
		const pieces = visiblePieces(ring, [regionOf('M15 15L30 15L30 30L15 30Z')], 1);

		expect(pieces).toHaveLength(1);
	});
});

describe('the built drawings', () => {
	it('never hide a whole stroke, so that every stroke takes some drawing time', () => {
		for (const picture of DRAWINGS) {
			for (const stroke of picture.strokes) expect(stroke.pieces.length).toBeGreaterThan(0);
		}
	});

	it('give every coloured form its shade, except the flat ones', () => {
		for (const picture of DRAWINGS) {
			for (const stroke of paintOrder(picture)) {
				expect(stroke.shade !== undefined).toBe(stroke.flat !== true);
			}
		}
	});
});
