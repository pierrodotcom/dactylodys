import { fingerForKey, modifierCodes } from './fingering';
import type {
	Finger,
	FingerName,
	FingeringProfile,
	Hand,
	KeyboardGeometryDefinition,
	KeyCode,
	KeyPress
} from './types';

/**
 * A point on the drawn keyboard, from its top left corner, in key pitches: one letter key and the
 * gap after it. Key `i` of a row starts at the sum of the widths before it, offset included.
 */
export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface KeyBox {
	readonly left: number;
	readonly right: number;
	readonly center: Point;
}

export interface FingerShape {
	readonly finger: Finger;
	/** Where the fingertip rests. */
	readonly tip: Point;
	/** The knuckle the finger grows from. */
	readonly base: Point;
}

export interface HandShape {
	readonly hand: Hand;
	readonly fingers: readonly FingerShape[];
	/** Corners of the palm, in drawing order. */
	readonly palm: readonly Point[];
}

/** A finger that leaves its resting place to show a key, then comes back. */
export interface FingerMove {
	readonly finger: Finger;
	readonly code: KeyCode;
	readonly from: Point;
	readonly to: Point;
}

/** Proportions of the drawn hands, in key pitches. */
const SHAPE = {
	/** From a fingertip on the home row down to its knuckle. */
	knuckleDrop: 1.5,
	/** How far each knuckle leans towards the middle of the keyboard. */
	fan: { pinky: 0.35, ring: 0.15, middle: 0, index: -0.1 },
	/** From the knuckles down to the wrist. */
	wristDrop: 1.7,
	/** How much narrower the wrist is than the knuckles, on each side. */
	wristInset: 0.2,
	/** From the tip of the index towards the middle, where the thumb rests on the bottom row. */
	thumbReach: 1.1,
	/** From the knuckle of the index down to the root of the thumb. */
	thumbRootDrop: 1,
	/** A key the finger already rests on is shown by a little press downwards. */
	pressDip: 0.3,
	/** How close to the edge of a wide key the finger goes. */
	edgeMargin: 0.5
} as const;

const FINGER_ORDER: readonly Exclude<FingerName, 'thumb'>[] = ['pinky', 'ring', 'middle', 'index'];
const HANDS: readonly Hand[] = ['left', 'right'];

/** Every key of the drawing with its place, in key pitches. */
export function keyBoxes(geometry: KeyboardGeometryDefinition): ReadonlyMap<KeyCode, KeyBox> {
	const boxes = new Map<KeyCode, KeyBox>();
	geometry.rows.forEach((row, rowIndex) => {
		let left = row.offset;
		for (const key of row.keys) {
			const right = left + key.width;
			boxes.set(key.code, { left, right, center: { x: (left + right) / 2, y: rowIndex + 0.5 } });
			left = right;
		}
	});
	return boxes;
}

/** Width and height of the drawing, in key pitches. */
export function keyboardSize(geometry: KeyboardGeometryDefinition): {
	readonly width: number;
	readonly height: number;
} {
	const width = Math.max(
		0,
		...geometry.rows.map((row) => row.keys.reduce((sum, key) => sum + key.width, row.offset))
	);
	return { width, height: geometry.rows.length };
}

/** +1 when the middle of the keyboard is to the right of the hand, -1 when it is to the left. */
function inward(hand: Hand): number {
	return hand === 'left' ? 1 : -1;
}

function handShape(
	hand: Hand,
	boxes: ReadonlyMap<KeyCode, KeyBox>,
	fingering: FingeringProfile
): HandShape | null {
	const side = inward(hand);
	const fingers: FingerShape[] = [];
	for (const name of FINGER_ORDER) {
		const finger: Finger = `${hand}-${name}`;
		const code = fingering.homeKeys[finger];
		const box = code === undefined ? undefined : boxes.get(code);
		if (box === undefined) continue;
		const tip = box.center;
		fingers.push({
			finger,
			tip,
			base: { x: tip.x + side * SHAPE.fan[name], y: tip.y + SHAPE.knuckleDrop }
		});
	}
	const outer = fingers[0];
	const index = fingers.find((shape) => shape.finger === `${hand}-index`);
	if (outer === undefined || index === undefined) return null;

	// Only a thumb with a home key is drawn: two thumbs on the space bar left a child unsure which one presses it.
	const thumbKey = fingering.homeKeys[`${hand}-thumb`];
	const thumbBox = thumbKey === undefined ? undefined : boxes.get(thumbKey);
	if (thumbBox !== undefined) {
		fingers.push({
			finger: `${hand}-thumb`,
			tip: { x: index.tip.x + side * SHAPE.thumbReach, y: thumbBox.center.y },
			base: { x: index.base.x, y: index.base.y + SHAPE.thumbRootDrop }
		});
	}

	const wristY = (point: Point) => point.y + SHAPE.wristDrop;
	return {
		hand,
		fingers,
		palm: [
			outer.base,
			index.base,
			{ x: index.base.x - side * SHAPE.wristInset, y: wristY(index.base) },
			{ x: outer.base.x + side * SHAPE.wristInset, y: wristY(outer.base) }
		]
	};
}

/** The two hands at rest: each fingertip on its home key, a thumb only where the fingering puts one. */
export function restingHands(
	geometry: KeyboardGeometryDefinition,
	fingering: FingeringProfile
): readonly HandShape[] {
	const boxes = keyBoxes(geometry);
	return HANDS.flatMap((hand) => handShape(hand, boxes, fingering) ?? []);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** The point of a key a finger coming from `from` reaches: the near end of a wide key. */
function reachedPoint(box: KeyBox, from: Point): Point {
	const min = Math.min(box.left + SHAPE.edgeMargin, box.center.x);
	const max = Math.max(box.right - SHAPE.edgeMargin, box.center.x);
	const point = { x: clamp(from.x, min, max), y: box.center.y };
	const distance = Math.hypot(point.x - from.x, point.y - from.y);
	return distance < SHAPE.pressDip ? { x: from.x, y: from.y + SHAPE.pressDip } : point;
}

/**
 * The fingers that show a key press: the typing finger, then the fingers on the modifiers it
 * needs (the little finger of the other hand on Shift, the right thumb on AltGr). Empty when the
 * key or its finger is not drawn.
 */
export function fingerMoves(
	geometry: KeyboardGeometryDefinition,
	fingering: FingeringProfile,
	press: KeyPress
): readonly FingerMove[] {
	const boxes = keyBoxes(geometry);
	const tips = new Map(
		restingHands(geometry, fingering).flatMap((hand) =>
			hand.fingers.map((shape) => [shape.finger, shape.tip] as const)
		)
	);
	return [press.code, ...modifierCodes(press, fingering)].flatMap((code) => {
		const finger = fingerForKey(fingering, code);
		const from = finger === null ? undefined : tips.get(finger);
		const box = boxes.get(code);
		if (finger === null || from === undefined || box === undefined) return [];
		return [{ finger, code, from, to: reachedPoint(box, from) }];
	});
}

/** Thickness of the drawn fingers and of their outline, in key pitches. */
export const HAND_STROKES = { finger: 0.56, outline: 0.08 } as const;

/** Where a moving finger is, `progress` going from 0 (at rest) to 1 (on the key). */
export function tipAt(move: FingerMove, progress: number): Point {
	return {
		x: move.from.x + (move.to.x - move.from.x) * progress,
		y: move.from.y + (move.to.y - move.from.y) * progress
	};
}
