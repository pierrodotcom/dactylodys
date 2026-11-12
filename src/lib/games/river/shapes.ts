/**
 * The objects that float down the river, drawn around (0, 0) at full size, about 60 wide: their
 * waterline is at y = 12. Each part is filled with a paint of the theme (`ObjectArt.svelte`).
 */
import { dotPath, leafShape, leafVein, ovalShape, starShape } from '../shared/decor-art';

export type Paint =
	| 'leaf'
	| 'paper'
	| 'paper-fold'
	| 'duck'
	| 'beak'
	| 'glass'
	| 'cork'
	| 'apple'
	| 'cup'
	| 'tea'
	| 'cup-dot'
	| 'ball-a'
	| 'ball-b'
	| 'ball-base'
	| 'star'
	| 'ring'
	| 'ring-band'
	| 'hat'
	| 'hat-band'
	| 'lily-pad'
	| 'lily-petal'
	| 'lily-heart'
	| 'rocket'
	| 'rocket-fin'
	| 'rocket-window'
	| 'line'
	| 'light';

export interface ArtPart {
	readonly d: string;
	readonly paint: Paint;
	/** Drawn with its outline, right after its fill: `true` unless said otherwise. */
	readonly outlined?: boolean;
	/** A shape with a hole in it. */
	readonly holed?: boolean;
}

export interface ObjectArt {
	readonly id: string;
	readonly parts: readonly ArtPart[];
	/** Thick lines drawn over the parts. */
	readonly strokes?: string;
	/** Thin lines drawn over the parts. */
	readonly fine?: string;
}

type XY = readonly [number, number];

function polar(radius: number, degrees: number, center: XY = [0, 0]): XY {
	const angle = (degrees * Math.PI) / 180;
	return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
}

function pt([x, y]: XY): string {
	return `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
}

/** A piece of a ring, between two radiuses and two angles (degrees, clockwise from the right). */
function ringSector(center: XY, inner: number, outer: number, from: number, to: number): string {
	return (
		`M${pt(polar(outer, from, center))}A${outer} ${outer} 0 0 1 ${pt(polar(outer, to, center))}` +
		`L${pt(polar(inner, to, center))}A${inner} ${inner} 0 0 0 ${pt(polar(inner, from, center))}Z`
	);
}

const RING_CENTER: XY = [0, -4];
const RING_OUTER = 17;
const RING_INNER = 8;

/** Every object, in the order they come down the river. Never shuffled. */
export const OBJECT_ARTS: readonly ObjectArt[] = [
	{
		id: 'leaf',
		parts: [{ d: leafShape(0, 5, 54, -4), paint: 'leaf' }],
		strokes: 'M-27 7Q-31 4 -32 0',
		fine: leafVein(0, 5, 54, -4)
	},
	{
		id: 'paper-boat',
		parts: [
			{ d: 'M-15 -1L0 -27L15 -1Z', paint: 'paper' },
			{ d: 'M0 -27L15 -1H0Z', paint: 'paper-fold', outlined: false },
			{ d: 'M-27 -1H27L17 12H-17Z', paint: 'paper' }
		],
		fine: 'M0 -27V-1M-20 5H20'
	},
	{
		id: 'duck',
		parts: [
			{ d: 'M-21 0L-28 -9L-17 -5Z', paint: 'duck' },
			{ d: ovalShape(-2, 4, 22, 9.5), paint: 'duck' },
			{ d: dotPath(11, -10, 9.5), paint: 'duck' },
			{ d: 'M19 -13Q28 -13 29 -9Q26 -5 19 -6Z', paint: 'beak' },
			{ d: dotPath(13, -12, 1.8), paint: 'line', outlined: false }
		],
		fine: 'M-12 1Q-2 10 8 2'
	},
	{
		id: 'bottle',
		parts: [
			{
				d: 'M-18 -5H6Q12 -5 15 0H22V8H15Q12 13 6 13H-18Q-25 13 -25 4Q-25 -5 -18 -5Z',
				paint: 'glass'
			},
			{ d: 'M-17 0H3V8H-17Z', paint: 'paper' },
			{ d: 'M22 -0.5H29V8.5H22Z', paint: 'cork' },
			{ d: ovalShape(-15, -1.5, 5, 1.6), paint: 'light', outlined: false }
		],
		fine: 'M-13 4H-1'
	},
	{
		id: 'apple',
		parts: [
			{
				d: 'M0 -8C-8 -16 -21 -11 -19 1C-17 12 -7 15 0 11C7 15 17 12 19 1C21 -11 8 -16 0 -8Z',
				paint: 'apple'
			},
			{ d: leafShape(10, -17, 13, -20), paint: 'leaf' },
			{ d: ovalShape(-10, -2, 3, 5), paint: 'light', outlined: false }
		],
		strokes: 'M0 -8Q1 -15 5 -19'
	},
	{
		id: 'teacup',
		parts: [
			{ d: 'M-17 -8H17Q17 6 9 11H-9Q-17 6 -17 -8Z', paint: 'cup' },
			{ d: ovalShape(0, -8, 17, 3.5), paint: 'tea' },
			{ d: dotPath(-8, 1, 2.2), paint: 'cup-dot', outlined: false },
			{ d: dotPath(0, 4, 2.2), paint: 'cup-dot', outlined: false },
			{ d: dotPath(8, 1, 2.2), paint: 'cup-dot', outlined: false }
		],
		strokes: 'M16.5 -5Q26 -5 24 2Q22 6 13 5'
	},
	{
		id: 'ball',
		parts: [
			{ d: dotPath(0, -4, 16), paint: 'ball-base', outlined: false },
			{ d: 'M0 -20A16 16 0 0 0 0 12Q-9 -4 0 -20Z', paint: 'ball-a', outlined: false },
			{ d: 'M0 -20A16 16 0 0 1 0 12Q9 -4 0 -20Z', paint: 'ball-b', outlined: false },
			{ d: ovalShape(-8, -10, 3, 4), paint: 'light', outlined: false }
		],
		strokes: dotPath(0, -4, 16),
		fine: 'M0 -20Q-9 -4 0 12Q9 -4 0 -20'
	},
	{
		id: 'star',
		parts: [
			{ d: starShape(0, -4, 20), paint: 'star' },
			{ d: dotPath(-5, -6, 1.8), paint: 'line', outlined: false },
			{ d: dotPath(5, -6, 1.8), paint: 'line', outlined: false }
		],
		strokes: 'M-4 0Q0 3.5 4 0'
	},
	{
		id: 'ring',
		parts: [
			{
				d:
					dotPath(RING_CENTER[0], RING_CENTER[1], RING_OUTER) +
					dotPath(RING_CENTER[0], RING_CENTER[1], RING_INNER),
				paint: 'ring',
				outlined: false,
				holed: true
			},
			...[25, 115, 205, 295].map((from) => ({
				d: ringSector(RING_CENTER, RING_INNER, RING_OUTER, from, from + 40),
				paint: 'ring-band' as const,
				outlined: false
			}))
		],
		strokes:
			dotPath(RING_CENTER[0], RING_CENTER[1], RING_OUTER) +
			dotPath(RING_CENTER[0], RING_CENTER[1], RING_INNER)
	},
	{
		id: 'straw-hat',
		parts: [
			{ d: ovalShape(0, 7, 27, 6), paint: 'hat' },
			{ d: 'M-13 6C-14 -14 14 -14 13 6Z', paint: 'hat' },
			{ d: 'M-13.4 0C-6 2 6 2 13.4 0L13.2 -4C6 -2 -6 -2 -13.2 -4Z', paint: 'hat-band' }
		]
	},
	{
		id: 'water-lily',
		parts: [
			{ d: 'M-27 8C-27 0 27 0 27 8C27 16 -27 16 -27 8Z', paint: 'lily-pad' },
			{ d: leafShape(-13, 1, 16, -165), paint: 'lily-petal' },
			{ d: leafShape(13, 1, 16, -15), paint: 'lily-petal' },
			{ d: leafShape(-7, -4, 20, -122), paint: 'lily-petal' },
			{ d: leafShape(7, -4, 20, -58), paint: 'lily-petal' },
			{ d: leafShape(0, -7, 22, -90), paint: 'lily-petal' },
			{ d: dotPath(0, 1, 4), paint: 'lily-heart' }
		],
		fine: 'M14 9L22 5'
	},
	{
		id: 'cork-rocket',
		parts: [
			{ d: 'M-9 -3L-17 8L-9 5Z', paint: 'rocket-fin' },
			{ d: 'M9 -3L17 8L9 5Z', paint: 'rocket-fin' },
			{ d: 'M0 -27Q11 -15 9 5H-9Q-11 -15 0 -27Z', paint: 'rocket' },
			{ d: dotPath(0, -11, 4.2), paint: 'rocket-window' },
			{ d: 'M-8 5H8V12Q0 14 -8 12Z', paint: 'cork' }
		]
	}
];

/** A soft ring on the water around an object that floats. */
export const RIPPLE = 'M-30 12Q-24 9 -16 11M16 11Q24 9 30 12';
