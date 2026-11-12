/**
 * Where the sheet is laid for each decor (`shared/decor.ts`), in the units of the scene (520 x 240):
 * the grass of a meadow or the sand of a beach instead of the desk. The sheet, the drawing, the
 * pencils and the tape never change; the props stay on the sides, out from under the sheet.
 */
import { dotPath, ovalShape, starShape } from '../shared/decor-art';

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/* ------------------------------------------------------------------ Meadow */

/** Tufts of grass all over the meadow: three blades each, on (x, y). */
const TUFT_SPOTS = [
	[18, 22],
	[74, 30],
	[46, 70],
	[96, 64],
	[14, 108],
	[62, 152],
	[100, 132],
	[20, 196],
	[78, 214],
	[426, 104],
	[496, 96],
	[462, 152],
	[506, 176],
	[428, 186],
	[470, 228],
	[250, 236],
	[150, 236],
	[350, 236]
] as const;

export const GRASS_TUFTS = TUFT_SPOTS.map(
	([x, y]) =>
		`M${pt(x - 4, y)}Q${pt(x - 4.6, y - 4)} ${pt(x - 7, y - 6.6)}` +
		`M${pt(x, y)}Q${pt(x, y - 5)} ${pt(x - 0.6, y - 8.4)}` +
		`M${pt(x + 4, y)}Q${pt(x + 4.6, y - 4)} ${pt(x + 7, y - 6)}`
).join('');

/** A daisy: white petals around a yellow heart. */
function daisy(cx: number, cy: number, r: number) {
	const petals = Array.from({ length: 8 }, (_, index) => {
		const angle = (index * 45 * Math.PI) / 180;
		return dotPath(cx + Math.cos(angle) * r * 0.62, cy + Math.sin(angle) * r * 0.62, r * 0.36);
	});
	return {
		petals,
		heart: dotPath(cx, cy, r * 0.36),
		light: dotPath(cx - r * 0.12, cy - r * 0.12, r * 0.12)
	};
}

export const DAISIES = [
	daisy(38, 44, 10),
	daisy(82, 100, 8),
	daisy(30, 152, 9),
	daisy(90, 186, 7),
	daisy(452, 124, 8.4),
	daisy(502, 222, 6.4)
];

/** A ladybird walking on the grass, toward the top left. */
const BUG = { x: 62, y: 124 } as const;
export const LADYBIRD = {
	head: dotPath(BUG.x - 4.6, BUG.y - 4.6, 3.2),
	body: ovalShape(BUG.x, BUG.y, 6.6, 6),
	split: `M${pt(BUG.x - 4, BUG.y - 4)}L${pt(BUG.x + 4.6, BUG.y + 4.6)}`,
	spots: [
		dotPath(BUG.x - 2.6, BUG.y + 2.2, 1.3),
		dotPath(BUG.x + 2.2, BUG.y - 2.8, 1.3),
		dotPath(BUG.x + 2.8, BUG.y + 2.6, 1)
	].join(''),
	light: ovalShape(BUG.x - 1.4, BUG.y - 3.6, 1.6, 0.9)
} as const;

/* ------------------------------------------------------------------ Beach */

/** The sea in the top left corner, the foam along its edge and the wet sand it leaves. */
export const SEA = {
	water: 'M-4 -4L112 -4Q104 14 82 20Q56 26 44 42Q30 62 -4 66Z',
	wet: 'M-4 -4L120 -4Q112 20 88 27Q62 33 51 48Q36 72 -4 76Z',
	foam: 'M112 -4Q104 14 82 20Q56 26 44 42Q30 62 -4 66',
	ripples: 'M60 8Q70 6 80 8M18 22Q28 20 38 22M12 44Q20 42 28 44'
} as const;

/** Ripples left by the wind in the sand. */
export const SAND_RIPPLES = [
	'M10 102Q30 96 50 102Q70 108 92 102',
	'M16 132Q36 126 56 132Q76 138 98 132',
	'M420 112Q440 106 460 112Q480 118 504 112',
	'M418 150Q438 144 458 150Q478 156 500 150',
	'M8 218Q28 212 48 218',
	'M440 226Q456 221 472 226',
	'M150 236Q180 232 210 236M300 236Q330 232 360 236'
].join('');

/** A scallop shell standing on its hinge at (x, y), opening upward. */
function scallop(x: number, y: number, r: number) {
	const fan =
		`M${pt(x - 3, y)}L${pt(x - r, y - r * 0.9)}` +
		`Q${pt(x - r * 0.8, y - r * 1.5)} ${pt(x, y - r * 1.5)}` +
		`Q${pt(x + r * 0.8, y - r * 1.5)} ${pt(x + r, y - r * 0.9)}L${pt(x + 3, y)}Z`;
	const hinge = `M${pt(x - 5, y + 2.6)}L${pt(x - 3, y - 1)}L${pt(x + 3, y - 1)}L${pt(x + 5, y + 2.6)}Z`;
	const ribs = [-0.62, -0.3, 0, 0.3, 0.62]
		.map((k) => `M${pt(x + k * 2, y - 1)}L${pt(x + k * r * 1.1, y - r * 1.36)}`)
		.join('');
	return { fan, hinge, ribs };
}

export const SHELLS = [scallop(44, 186, 13), scallop(456, 132, 9)];

/** A starfish, a little turned. */
export const STARFISH = {
	body: starShape(72, 154, 14, 5),
	dots: [
		dotPath(72, 154, 1.4),
		dotPath(72, 146, 1),
		dotPath(79, 152, 1),
		dotPath(65, 152, 1),
		dotPath(76, 160, 1),
		dotPath(68, 160, 1)
	].join('')
} as const;

export const PEBBLES = [
	ovalShape(96, 222, 4.6, 3),
	ovalShape(30, 116, 3.4, 2.4),
	ovalShape(500, 200, 4, 2.8),
	ovalShape(430, 128, 2.6, 2)
].join('');
