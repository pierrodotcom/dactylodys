import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFingeringProfile } from './fingering';
import { parseGeometry } from './geometry';
import {
	HAND_STROKES,
	fingerMoves,
	keyBoxes,
	keyboardSize,
	restingHands,
	tipAt,
	type Point
} from './hands';
import type { ModifierLevel } from './types';

const geometry = parseGeometry(
	JSON.parse(readFileSync('layouts/geometry/iso-105.json', 'utf8')) as unknown
);
const fingering = parseFingeringProfile(
	JSON.parse(readFileSync('layouts/fingering/ten-fingers-iso.json', 'utf8')) as unknown
);
const boxes = keyBoxes(geometry);
const LEVELS: readonly ModifierLevel[] = ['base', 'shift', 'altgr', 'shiftAltgr'];

describe('keyBoxes and keyboardSize', () => {
	it('places the keys of a row one after the other, in key pitches', () => {
		expect(boxes.get('CapsLock')).toEqual({ left: 0, right: 1.75, center: { x: 0.875, y: 2.5 } });
		expect(boxes.get('KeyA')).toEqual({ left: 1.75, right: 2.75, center: { x: 2.25, y: 2.5 } });
		expect(boxes.get('Space')?.center).toEqual({ x: 7.5, y: 4.5 });
	});

	it('measures the widest row and counts the rows', () => {
		expect(keyboardSize(geometry)).toEqual({ width: 15, height: 5 });
	});

	it('starts a row after its offset', () => {
		const shifted = { ...geometry, rows: [{ offset: 0.5, keys: [{ code: 'KeyQ', width: 1 }] }] };
		expect(keyBoxes(shifted).get('KeyQ')?.left).toBe(0.5);
		expect(keyboardSize(shifted).width).toBe(1.5);
	});
});

describe('restingHands', () => {
	const hands = restingHands(geometry, fingering);

	it('draws two hands, the left one first', () => {
		expect(hands.map((hand) => hand.hand)).toEqual(['left', 'right']);
	});

	it('puts every fingertip on its home key and every knuckle below it', () => {
		for (const hand of hands) {
			for (const shape of hand.fingers) {
				const home = fingering.homeKeys[shape.finger];
				if (home !== undefined && !shape.finger.endsWith('thumb')) {
					expect(shape.tip).toEqual(boxes.get(home)?.center);
				}
				expect(shape.base.y).toBeGreaterThan(shape.tip.y);
			}
		}
	});

	it('rests on the space bar only the thumb the fingering gives it to', () => {
		const space = boxes.get('Space');
		const thumbs = hands.flatMap((hand) =>
			hand.fingers.filter((shape) => shape.finger.endsWith('thumb'))
		);
		expect(thumbs.map((shape) => shape.finger)).toEqual(['right-thumb']);
		const tip = thumbs[0]?.tip;
		expect(tip?.y).toBe(space?.center.y);
		expect(tip?.x).toBeGreaterThan(space?.left ?? Infinity);
		expect(tip?.x).toBeLessThan(space?.right ?? -Infinity);
	});

	it('draws the left thumb instead when the fingering gives it the space bar', () => {
		const data = JSON.parse(readFileSync('layouts/fingering/ten-fingers-iso.json', 'utf8'));
		const homeKeys = Object.fromEntries(
			Object.entries(fingering.homeKeys).filter(([finger]) => finger !== 'right-thumb')
		);
		const leftThumb = parseFingeringProfile({
			...data,
			fingers: { ...data.fingers, Space: 'left-thumb' },
			homeKeys: { ...homeKeys, 'left-thumb': 'Space' }
		});
		const thumbs = restingHands(geometry, leftThumb).flatMap((hand) =>
			hand.fingers.filter((shape) => shape.finger.endsWith('thumb'))
		);
		expect(thumbs.map((shape) => shape.finger)).toEqual(['left-thumb']);
	});

	it('leaves every letter of the bottom row clear: the fingers pass between them, the palm below', () => {
		// A letter is drawn in the middle of its key: measured on the screen, about 0.16 key pitch
		// from its centre across and 0.12 up and down, with a margin.
		const glyph = { x: 0.18, y: 0.16 };
		const halfStroke = HAND_STROKES.finger / 2 + HAND_STROKES.outline;
		const bottomRow = geometry.rows[3]?.keys ?? [];
		const letters = bottomRow
			.map((key) => boxes.get(key.code))
			.filter((box) => box !== undefined && box.right - box.left === 1)
			.map((box) => box?.center as Point);
		expect(letters.length).toBeGreaterThanOrEqual(10);

		const distance = (point: Point, from: Point, to: Point) => {
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const length = dx * dx + dy * dy;
			const along = length === 0 ? 0 : ((point.x - from.x) * dx + (point.y - from.y) * dy) / length;
			const t = Math.max(0, Math.min(1, along));
			return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
		};
		for (const hand of hands) {
			for (const letter of letters) {
				const corners = [-1, 0, 1].flatMap((sx) =>
					[-1, 0, 1].map((sy) => ({ x: letter.x + sx * glyph.x, y: letter.y + sy * glyph.y }))
				);
				for (const shape of hand.fingers) {
					for (const corner of corners) {
						expect(distance(corner, shape.tip, shape.joint)).toBeGreaterThan(halfStroke);
						expect(distance(corner, shape.joint, shape.base)).toBeGreaterThan(halfStroke);
					}
				}
			}
			const palmTop = Math.min(...hand.palm.map((point) => point.y)) - halfStroke;
			expect(palmTop).toBeGreaterThan((letters[0]?.y ?? 0) + glyph.y);
		}
	});

	it('gives each hand a palm under its knuckles', () => {
		for (const hand of hands) {
			expect(hand.palm.length).toBeGreaterThanOrEqual(4);
			const knuckles = Math.max(...hand.fingers.map((shape) => shape.base.y));
			expect(Math.max(...hand.palm.map((point) => point.y))).toBeGreaterThan(knuckles);
		}
	});

	it('leaves out a hand whose index has no home key', () => {
		const homeKeys = { ...fingering.homeKeys };
		delete homeKeys['left-index'];
		expect(restingHands(geometry, { ...fingering, homeKeys }).map((hand) => hand.hand)).toEqual([
			'right'
		]);
	});
});

describe('fingerMoves', () => {
	it('moves the left middle finger from D up to E', () => {
		expect(fingerMoves(geometry, fingering, { code: 'KeyE', level: 'base' })).toEqual([
			{
				finger: 'left-middle',
				code: 'KeyE',
				from: boxes.get('KeyD')?.center,
				to: boxes.get('KeyE')?.center
			}
		]);
	});

	it('shows a key the finger rests on by a little press downwards', () => {
		const [move] = fingerMoves(geometry, fingering, { code: 'KeyF', level: 'base' });
		expect(move?.to.x).toBe(move?.from.x);
		expect(move?.to.y).toBeGreaterThan(move?.from.y ?? Infinity);
	});

	it('adds the little finger of the other hand on Shift for a capital', () => {
		const moves = fingerMoves(geometry, fingering, { code: 'KeyF', level: 'shift' });
		expect(moves.map((move) => [move.finger, move.code])).toEqual([
			['left-index', 'KeyF'],
			['right-pinky', 'ShiftRight']
		]);
	});

	it('goes to the near end of a wide key rather than to its middle', () => {
		const [, shift] = fingerMoves(geometry, fingering, { code: 'KeyF', level: 'shift' });
		const box = boxes.get('ShiftRight');
		expect(shift?.finger).toBe('right-pinky');
		expect(shift?.to.x).toBeLessThan(box?.center.x ?? -Infinity);
		expect(shift?.to.x).toBeGreaterThanOrEqual(box?.left ?? Infinity);
	});

	it('adds the right thumb on AltGr', () => {
		const moves = fingerMoves(geometry, fingering, { code: 'Digit2', level: 'altgr' });
		expect(moves.map((move) => move.code)).toEqual(['Digit2', 'AltRight']);
		expect(moves[1]?.finger).toBe('right-thumb');
	});

	it('shows nothing for a key that is not drawn or has no finger', () => {
		expect(fingerMoves(geometry, fingering, { code: 'Unknown', level: 'base' })).toEqual([]);
		expect(fingerMoves(geometry, fingering, { code: 'Escape', level: 'base' })).toEqual([]);
	});

	it('always lands on the key it shows, starting from where the finger rests', () => {
		const codes = Object.keys(fingering.fingers).filter((code) => boxes.has(code));
		fc.assert(
			fc.property(fc.constantFrom(...codes), fc.constantFrom(...LEVELS), (code, level) => {
				const moves = fingerMoves(geometry, fingering, { code, level });
				expect(moves[0]?.code).toBe(code);
				for (const move of moves) {
					const box = boxes.get(move.code);
					expect(move.finger).toBe(fingering.fingers[move.code]);
					expect(move.to.x).toBeGreaterThanOrEqual(box?.left ?? Infinity);
					expect(move.to.x).toBeLessThanOrEqual(box?.right ?? -Infinity);
					expect(Math.abs(move.to.y - (box?.center.y ?? Infinity))).toBeLessThan(0.5);
					expect(move.to).not.toEqual(move.from);
				}
			})
		);
	});
});

describe('tipAt', () => {
	const move = {
		finger: 'left-middle' as const,
		code: 'KeyE',
		from: { x: 4, y: 2.5 },
		to: { x: 3.5, y: 1.5 }
	};

	it('rests at 0, lands on the key at 1, and is halfway at 0.5', () => {
		expect(tipAt(move, 0)).toEqual(move.from);
		expect(tipAt(move, 1)).toEqual(move.to);
		expect(tipAt(move, 0.5)).toEqual({ x: 3.75, y: 2 });
	});
});
