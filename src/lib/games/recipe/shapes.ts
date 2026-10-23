/**
 * Drawing data of the kitchen, lit from the top left. The ingredients are drawn in a local box of
 * about 90 x 76 centered on (0, 0), resting on y = 36; the kitchen in the units of the scene.
 * Paths that are moved or shaded by `mapPath` are written with absolute M, L, C, Q and Z commands in
 * "x y" pairs.
 */
import {
	capsulePath,
	checkerPath,
	ovalArc,
	ovalPath,
	ovalPoint,
	roundedStarPath,
	type XY
} from '$lib/ui/companion/geometry';

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/** The same path with every point moved by `move`. */
export function mapPath(d: string, move: (x: number, y: number) => XY): string {
	return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
		pt(...move(Number(x), Number(y)))
	);
}

function shift(d: string, dx: number, dy: number): string {
	return mapPath(d, (x, y) => [x + dx, y + dy]);
}

/**
 * The shade of a form: the form and a copy moved toward the light, filled even-odd and kept inside
 * the form by a clip, so that only the side away from the light stays.
 */
export function shadeOf(d: string, toward: number, down = toward): string {
	return d + shift(d, -toward, -down);
}

/** Mirrors a path of the scene around the middle of the pot. */
function mirrorScene(d: string): string {
	return mapPath(d, (x, y) => [520 - x, y]);
}

/** A leaf or a blade from `root` to `tip`, `width` wide at its belly. */
function leafPath(root: XY, tip: XY, width: number): string {
	const ux = tip[0] - root[0];
	const uy = tip[1] - root[1];
	const length = Math.hypot(ux, uy) || 1;
	const nx = (-uy / length) * width;
	const ny = (ux / length) * width;
	const at = (t: number, side: number): string =>
		pt(root[0] + ux * t + nx * side, root[1] + uy * t + ny * side);
	return `M${pt(...root)}C${at(0.3, 0.9)} ${at(0.75, 0.7)} ${pt(...tip)}C${at(0.75, -0.7)} ${at(0.3, -0.9)} ${pt(...root)}Z`;
}

/** The middle line of a leaf, from its root to most of the way to its tip. */
function veinPath(root: XY, tip: XY): string {
	const end: XY = [root[0] + (tip[0] - root[0]) * 0.8, root[1] + (tip[1] - root[1]) * 0.8];
	return `M${pt(...root)}L${pt(...end)}`;
}

/** A rounded blob: six points around (cx, cy), joined by smooth curves. */
function blob(cx: number, cy: number, rx: number, ry: number, turn: number): string {
	const wobble = [1, 0.82, 1.06, 0.9, 1.1, 0.86];
	const points: XY[] = wobble.map((w, i) => {
		const angle = ((i * 60 + turn) * Math.PI) / 180;
		return [cx + rx * w * Math.cos(angle), cy + ry * w * Math.sin(angle)];
	});
	const mid = (a: XY, b: XY): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
	const first = points[0] ?? [cx, cy];
	const last = points[points.length - 1] ?? first;
	const curves = points.map((p, i) => `Q${pt(...p)} ${pt(...mid(p, points[(i + 1) % 6] ?? p))}`);
	return `M${pt(...mid(last, first))}${curves.join('')}Z`;
}

/** A thin band across an ingredient, bent a little: the face of a cut, kept inside by a clip. */
function cutBand(x: number, top: number, bottom: number, bend = 2.6, width = 2.6): string {
	const middle = (top + bottom) / 2;
	return (
		`M${pt(x, top)}Q${pt(x + bend, middle)} ${pt(x, bottom)}` +
		`L${pt(x + width, bottom)}Q${pt(x + width + bend, middle)} ${pt(x + width, top)}Z`
	);
}

/* ---------------------------------------------------------- The ingredients */

export type Tone =
	'carrot' | 'leaf' | 'tomato' | 'cheese' | 'rind' | 'cap' | 'stem' | 'gills' | 'glass';

/** A form of an ingredient: its fill, its shade and its lights (kept inside it), then its outline. */
export interface Part {
	readonly d: string;
	readonly tone: Tone;
	readonly shade?: string;
	readonly lights?: readonly string[];
}

export type DetailKind = 'crease' | 'face' | 'light' | 'shade' | 'hole' | 'edge';

export interface Detail {
	readonly d: string;
	readonly kind: DetailKind;
}

export interface IngredientDrawing {
	/** Drawn in this order; each has its own outline. */
	readonly parts: readonly Part[];
	/** Drawn over the parts, inside their outline. */
	readonly details: readonly Detail[];
	/** One per stage: the more good keys, the more are drawn. */
	readonly cuts: readonly string[];
	/** Where the cuts show, when not the whole ingredient. */
	readonly cutZone?: string;
}

/* Carrot: lying down, its leaves behind its shoulder. */

const CARROT_BODY =
	'M-24 4C-2 4 22 14 38 28.6C41 31 40 33.4 37 33.8C22 36.4 -4 37 -24 35C-36 34 -40 22 -37 14C-35 7 -30 4 -24 4Z';

const CARROT_LEAVES: readonly (readonly [XY, XY, number])[] = [
	[[-33, 13], [-47, -26], 6.4],
	[[-31, 10], [-25, -36], 7],
	[[-29, 11], [-6, -27], 6.4]
];

const CARROT: IngredientDrawing = {
	parts: [
		...CARROT_LEAVES.map(([root, tip, width]) => {
			const d = leafPath(root, tip, width);
			return { d, tone: 'leaf' as const, shade: shadeOf(d, 2.4) };
		}),
		{
			d: CARROT_BODY,
			tone: 'carrot',
			shade: shadeOf(CARROT_BODY, 3, 5),
			lights: [
				'M-27 8.6C-12 7.4 6 10.4 20 17.4C8 14.4 -10 12.6 -25.6 12.8C-28.6 12.8 -29.4 8.8 -27 8.6Z',
				ovalPath(-31, 18, 1.4, 2.4)
			]
		}
	],
	details: [
		...CARROT_LEAVES.map(([root, tip]) => ({ d: veinPath(root, tip), kind: 'crease' as const })),
		{
			d: 'M-18 30.4Q-13 32 -8 31.2M2 32.8Q6 33.6 10 33M-12 9.6Q-7 8.8 -2 9.8M12 16.4Q16 17.8 19 20M24 30.6Q27.4 30.8 30.6 29.6',
			kind: 'crease'
		}
	],
	cuts: [-21, -8, 6, 20].map((x) => cutBand(x, -2, 42)),
	cutZone: CARROT_BODY
};

/* Tomato: a round fruit with lobes, its green star on top. */

const TOMATO_BODY =
	'M0 -13C10 -19 28 -16 31 4C33 22 22 35.6 0 35.6C-22 35.6 -33 22 -31 4C-28 -16 -10 -19 0 -13Z';

const CALYX = mapPath(roundedStarPath(0, 0, 15, 6, 5, 0.28), (x, y) => [x, -14 + y * 0.48]);

const TOMATO_STEM = capsulePath(0.4, -15, 3, -25, 2.1);

const TOMATO: IngredientDrawing = {
	parts: [
		{
			d: TOMATO_BODY,
			tone: 'tomato',
			shade: shadeOf(TOMATO_BODY, 6, 6),
			lights: [
				'M-23 -1C-22 -8 -16 -13 -9 -14C-14 -10 -17.4 -5 -18.4 1C-18.8 3.4 -23.2 2.2 -23 -1Z',
				ovalPath(-8.6, -8.6, 2.6, 1.6),
				ovalPath(-24.6, 8, 1.2, 2.2)
			]
		},
		{ d: TOMATO_STEM, tone: 'leaf', shade: shadeOf(TOMATO_STEM, 0.8) },
		{ d: CALYX, tone: 'leaf', shade: shadeOf(CALYX, 1.6) }
	],
	details: [{ d: 'M-8 -11Q-16 -1 -14.6 11M8 -11Q16 -1 14.6 11', kind: 'crease' }],
	cuts: [-18, -7, 5, 16].map((x) => cutBand(x, -22, 40))
};

/* Cheese: a wedge seen from the front and a little from above; its rind on the right. */

/** The height of the top of the front face at `x`: the slope of the wedge. */
function cheeseSlope(x: number): number {
	return 36 - ((x + 40) * 44) / 70;
}

const CHEESE_DEPTH: XY = [8, -14];

const CHEESE_BODY =
	'M-37 36L28 36Q30 36 31.4 34.6L36.6 26.6Q38 24.4 38 22L38 -18.6Q38 -23 34.6 -20.8L-31 21.4Q-33.6 23 -35.4 26L-39.6 33Q-41 36 -37 36Z';

const CHEESE_TOP =
	'M-39.4 34.8L29.4 -7.4Q31 -8.4 32 -10.2L37.2 -19.6Q38.2 -22.4 35 -20.6L-31 21.4Q-33.4 23 -35 25.6Z';

const CHEESE_RIND = 'M30 36L30 -7.8L38 -21.6L38 22Q38 24.4 36.6 26.6L31.4 34.6Q30.8 35.6 30 36Z';

function cheeseCut(x: number): string {
	const [dx, dy] = CHEESE_DEPTH;
	const half = 1.5;
	const left = x - half;
	const right = x + half;
	const far = 1.25;
	return (
		`M${pt(left, 40)}L${pt(left, cheeseSlope(left))}L${pt(left + dx * far, cheeseSlope(left) + dy * far)}` +
		`L${pt(right + dx * far, cheeseSlope(right) + dy * far)}L${pt(right, cheeseSlope(right))}L${pt(right, 40)}Z`
	);
}

const CHEESE: IngredientDrawing = {
	parts: [
		{
			d: CHEESE_BODY,
			tone: 'cheese',
			shade: shadeOf(CHEESE_BODY, 3, 4)
		}
	],
	details: [
		{ d: CHEESE_TOP, kind: 'light' },
		{ d: CHEESE_RIND, kind: 'face' },
		{
			d: [
				ovalPath(-12, 27.4, 4.4, 3.2),
				ovalPath(8.6, 18, 5.2, 4),
				ovalPath(20.4, 29.6, 3.2, 2.6),
				ovalPath(-26, 33.6, 2.6, 1.8),
				ovalPath(4, 33.6, 3.4, 2)
			].join(''),
			kind: 'hole'
		},
		{
			d: [
				'M-14.6 29.6C-12.6 30.4 -10.4 30.2 -8.4 28.8',
				'M5.2 21C8 22.2 11.2 22 13.4 20',
				'M18.4 31.6C19.8 32.2 21.2 32 22.4 31'
			].join(''),
			kind: 'light'
		},
		{ d: 'M-39.4 34.8L29.6 -7.6M30 -7.6L30 35.6M30 -7.6L37.6 -20.8', kind: 'edge' }
	],
	cuts: [-22, -8, 6, 19].map(cheeseCut)
};

/* Mushroom: a round cap over its gills, a stout stem. */

const MUSHROOM_STEM =
	'M-10 0C-11 12 -16 26 -15 31C-14 36 -6 37 0 37C6 37 14 36 15 31C16 26 11 12 10 0Z';

const MUSHROOM_GILLS = 'M-33 -3C-26 4 -12 8.4 0 8.4C12 8.4 26 4 33 -3Z';

const MUSHROOM_CAP =
	'M-35 -3C-37 -22 -20 -37 0 -37C20 -37 37 -22 35 -3C30 1 14 3 0 3C-14 3 -30 1 -35 -3Z';

const MUSHROOM: IngredientDrawing = {
	parts: [
		{
			d: MUSHROOM_STEM,
			tone: 'stem',
			shade: shadeOf(MUSHROOM_STEM, 3.4, 1),
			lights: ['M-8.6 8C-9.6 16 -11.6 24 -11.6 29C-11 30.4 -9.6 30.2 -9.4 29C-8.8 22 -8 15 -7 8Z']
		},
		{ d: MUSHROOM_GILLS, tone: 'gills', shade: shadeOf(MUSHROOM_GILLS, 0, -2.6) },
		{
			d: MUSHROOM_CAP,
			tone: 'cap',
			shade: shadeOf(MUSHROOM_CAP, 5, 5),
			lights: [
				'M-28.6 -12C-28.6 -22 -18.6 -31 -7 -33.4C-16 -28 -22 -21 -23.2 -12C-23.6 -9.4 -28.6 -9.4 -28.6 -12Z',
				ovalPath(10, -27, 3.6, 2.4),
				ovalPath(22, -17, 2.6, 2),
				ovalPath(-4, -22, 2, 1.4)
			]
		}
	],
	details: [
		{
			d: 'M-24 3.2L-21 5.4M-14 4.6L-12.6 7M-4.4 5L-4.2 8M5 5L4.8 8M14.6 4.6L13 7M24 3.2L21.4 5.4',
			kind: 'crease'
		}
	],
	cuts: [-20, -8, 4, 16].map((x) => cutBand(x, -40, 40))
};

/* Jug: a glass jug, its handle on the left and its spout on the right. */

const JUG_GLASS =
	'M-25 -28L23 -28Q28 -28 31.6 -32.4Q34.6 -35.6 36 -33Q37 -30.4 32 -23L32.4 30Q32.6 37 25.6 37L-25.6 37Q-32.6 37 -32.4 30L-27.4 -24Q-27.6 -28 -25 -28Z';

const JUG_HANDLE =
	'M-27.6 -19C-39 -21 -46 -13 -45.6 -1C-45.2 11 -38 18 -29.6 19L-29.2 11.6C-34.4 11 -38.4 6 -38.4 -1.4C-38.4 -9 -34 -12.4 -27.6 -12Z';

const JUG: IngredientDrawing = {
	parts: [
		{
			d: JUG_HANDLE,
			tone: 'glass',
			lights: ['M-41.6 -4C-41.4 -10 -38 -15 -32 -16C-36 -13 -38.2 -9 -38.6 -4Z']
		},
		{ d: JUG_GLASS, tone: 'glass' }
	],
	details: [
		{
			d: 'M-22.6 -25.6L22.4 -25.6L26.6 30Q26.8 33.6 23.4 33.6L-23.4 33.6Q-26.8 33.6 -26.6 30Z',
			kind: 'edge'
		},
		{
			d: 'M-21 -20C-23 -6 -24 10 -23 24C-22.6 26 -20.6 26 -20.4 24C-20 10 -19.6 -6 -18.6 -20C-18.6 -22 -20.8 -22 -21 -20Z',
			kind: 'light'
		},
		{ d: ovalPath(-20, 29, 1.2, 1), kind: 'light' },
		{ d: 'M17 -12L22.6 -12M18 0L23.4 0M19 12L24.4 12', kind: 'crease' }
	],
	cuts: []
};

export const INGREDIENTS: readonly IngredientDrawing[] = [CARROT, TOMATO, CHEESE, MUSHROOM, JUG];

/** The inside of the jug, where its liquid stays. */
export const JUG_INSIDE =
	'M-22.6 -25.6L22.4 -25.6L26.6 30Q26.8 33.6 23.4 33.6L-23.4 33.6Q-26.8 33.6 -26.6 30Z';

/** A light streak in the liquid, cut to the liquid that is left. */
export const LIQUID_LIGHT = 'M-19 -40L-14 -40L-14.6 40L-19.6 40Z';

/** The stream that falls from the spout of the jug into the pot. */
export const POUR_STREAM_PATH = 'M35.4 -31C44 -10 46 30 42 86';

/* ------------------------------------------------------------- The kitchen */

export const SCENE = { width: 520, height: 240 } as const;

/** Tiles on the wall behind the pot, one path. */
function tilesPath(): string {
	const width = 30;
	const height = 19;
	const gap = 3;
	const r = 3;
	const rows: string[] = [];
	for (let row = 0, y = 98; y < 196; row++, y += height + gap) {
		for (let x = row % 2 === 0 ? -14 : 2.5; x < 520; x += width + gap) {
			rows.push(
				`M${pt(x + r, y)}L${pt(x + width - r, y)}Q${pt(x + width, y)} ${pt(x + width, y + r)}` +
					`L${pt(x + width, y + height - r)}Q${pt(x + width, y + height)} ${pt(x + width - r, y + height)}` +
					`L${pt(x + r, y + height)}Q${pt(x, y + height)} ${pt(x, y + height - r)}` +
					`L${pt(x, y + r)}Q${pt(x, y)} ${pt(x + r, y)}Z`
			);
		}
	}
	return rows.join('');
}

const PLANT_LEAVES: readonly (readonly [XY, XY, number])[] = [
	[[478, 80], [466, 66], 4],
	[[479, 80], [476, 60], 4.4],
	[[480, 80], [490, 64], 4.2],
	[[481, 81], [496, 74], 3.6]
];

export const KITCHEN = {
	tilesPath: tilesPath(),
	counterTopPath: 'M-4 211L524 211L524 223L-4 223Z',
	counterFrontPath: 'M-4 223L524 223L524 244L-4 244Z',
	counterGrain:
		'M18 216.6L74 216.6M120 218.4L168 218.4M384 216.4L430 216.4M466 218.2L508 218.2' +
		'M12 233C52 230.6 92 235 140 232M300 238C344 235.6 384 240 436 236.6M410 229C440 227.6 470 230 500 228.4',
	counterLip: 'M-4 225L524 225',
	counterKnots: [ovalPath(96, 237, 4, 2.4), ovalPath(462, 233, 3.4, 2)].join(''),
	shelfTopPath: 'M176 108L344 108Q348 108 348 110.6L348 112L172 112L172 110.6Q172 108 176 108Z',
	shelfPath:
		'M176 108L344 108Q348 108 348 111L348 119Q348 122 345 122L175 122Q172 122 172 119L172 111Q172 108 176 108Z',
	shelfGrain: 'M188 117L232 117M262 115.6L302 115.6M314 118.8L338 118.8',
	shelfEdge: 'M172.4 112L347.6 112',
	bracketPaths: [
		'M190 122L203 122L203 125C203 131.6 198.6 137 191.6 138.6L190 138.6Z',
		'M317 122L330 122L330 138.6L328.4 138.6C321.4 137 317 131.6 317 125Z'
	],
	/** Where the ingredient waits on the shelf, and its shadow there. */
	boardIngredient: { x: 260, y: 70.6, scale: 1.15 },
	boardShadow: ovalPath(260, 111, 34, 2.4),
	potIngredient: { x: 260, y: 160.4, scale: 0.8 },
	window: {
		framePath:
			'M452 16L504 16Q510 16 510 22L510 88Q510 92 506 92L450 92Q446 92 446 88L446 22Q446 16 452 16Z',
		panePath: 'M455 23L501 23Q503 23 503 25L503 85L453 85L453 25Q453 23 455 23Z',
		barsPath: 'M476.6 23L479.4 23L479.4 85L476.6 85ZM453 52.6L503 52.6L503 55.4L453 55.4Z',
		sillPath: 'M442 88L514 88Q518 88 518 91.6Q518 96 514 96L442 96Q438 96 438 91.6Q438 88 442 88Z',
		sun: ovalPath(492, 33, 5.4, 5.4),
		cloud:
			'M459 45C459 41.6 462 39.6 465 40.4C466 37.4 469.6 36 472.4 37.6C474.4 35.6 478 36 479.2 38.6C481.4 38.8 482.6 41 482 43C482 45 480.6 46 478.6 46L461 46C459.6 46 459 45.6 459 45Z',
		gleams: 'M458 80L470 62L473 62L461 80ZM484 50L496 30L498.4 30L486.4 50Z'
	},
	plant: {
		potPath:
			'M467.4 80L491.6 80Q492.6 80 492.4 81.4L490.6 91.4Q490.4 93 488.8 93L470.2 93Q468.6 93 468.4 91.4L466.6 81.4Q466.4 80 467.4 80Z',
		rimPath:
			'M466 79L493 79Q494.6 79 494.6 80.8Q494.6 83.6 493 83.6L466 83.6Q464.4 83.6 464.4 80.8Q464.4 79 466 79Z',
		leaves: PLANT_LEAVES.map(([root, tip, width]) => leafPath(root, tip, width)),
		veins: PLANT_LEAVES.map(([root, tip]) => veinPath(root, tip)).join('')
	}
} as const;

/* ------------------------------------------------------------------ The pot */

const RIM = { cx: 260, cy: 160, rx: 120, ry: 26 } as const;
const RIM_INNER = { rx: 112, ry: 22 } as const;
const SOUP = { cx: 260, cy: 163, rx: 104, ry: 17.5 } as const;

const POT_INSIDE = ovalPath(RIM.cx, RIM.cy, RIM_INNER.rx, RIM_INNER.ry);
const POT_SOUP = ovalPath(SOUP.cx, SOUP.cy, SOUP.rx, SOUP.ry);
const POT_BODY = `M140 160C140 194 146 212 168 217C204 222 316 222 352 217C374 212 380 194 380 160${ovalArc(RIM.cx, RIM.cy, RIM.rx, RIM.ry, 0, 180)}Z`;
const LEFT_HANDLE =
	'M147 171C130 168 115 174 114.6 184C114.2 194 126 199 148 196L148 189.6C131 191.6 122 190 122 184.4C122 179 131 176.6 147 178Z';
const LEFT_HANDLE_LIGHT =
	'M117.6 181.4C119 177 125 173.6 134 172.6C127 175.4 122.8 178.4 121.6 182.4Z';
const RIVETS = [ovalPath(152.6, 174.6, 2.1, 2.1), ovalPath(152.6, 192.4, 2.1, 2.1)];

function rimArc(rx: number, ry: number, from: number, to: number): string {
	return `M${pt(...ovalPoint(RIM.cx, RIM.cy, rx, ry, from))}${ovalArc(RIM.cx, RIM.cy, rx, ry, from, to)}`;
}

export const POT = {
	shadowPath: ovalPath(260, 218, 124, 7),
	handlePaths: [LEFT_HANDLE, mirrorScene(LEFT_HANDLE)],
	handleLights: [LEFT_HANDLE_LIGHT, mirrorScene(LEFT_HANDLE_LIGHT)],
	rivets: [...RIVETS, ...RIVETS.map(mirrorScene)].join(''),
	ringPath: `${ovalPath(RIM.cx, RIM.cy, RIM.rx, RIM.ry)}${POT_INSIDE}`,
	insidePath: POT_INSIDE,
	/** Light on the inner wall across from the light: the right side of the inside. */
	insideLight: `${POT_INSIDE}${shift(POT_INSIDE, -18, 2)}`,
	soupPath: POT_SOUP,
	/** The soup darkens where it meets the back wall. */
	soupBack: `${POT_SOUP}${shift(POT_SOUP, 0, 5)}`,
	soupLights: [ovalPath(226, 168, 22, 2.4), ovalPath(306, 155.6, 12, 1.8)].join(''),
	/** The front of the soup, drawn over the ingredient so that it floats in it. */
	soupFront: `M${pt(SOUP.cx - SOUP.rx, SOUP.cy)}${ovalArc(SOUP.cx, SOUP.cy, SOUP.rx, SOUP.ry, 180, 0)}${ovalArc(SOUP.cx, SOUP.cy, SOUP.rx, 9, 0, 180)}Z`,
	ripplePath: `M${pt(...ovalPoint(SOUP.cx, SOUP.cy, SOUP.rx, 9, 128))}${ovalArc(SOUP.cx, SOUP.cy, SOUP.rx, 9, 128, 52)}`,
	bodyPath: POT_BODY,
	bodyShade: shadeOf(POT_BODY, 14, 0),
	bodyLights: [
		'M152 180C152 196 158 208 170 214.4C166.6 206 165 196 165 182C161 182 156 181 152 180Z',
		'M175 186C175 198 177 208 181 215.4C183 215.6 184.4 215 184.2 213.6C182.4 206 181.4 198 181.4 187Z'
	],
	/** The front half of the rim, over the body and the ingredient. */
	lipPath: `${rimArc(RIM.rx, RIM.ry, 0, 180)}L${pt(RIM.cx - RIM_INNER.rx, RIM.cy)}${ovalArc(RIM.cx, RIM.cy, RIM_INNER.rx, RIM_INNER.ry, 180, 0)}Z`,
	/** The shade the rim casts on the body just under it. */
	underLip: `${rimArc(RIM.rx, RIM.ry, 0, 180)}L${pt(RIM.cx - RIM.rx, RIM.cy + 4)}${ovalArc(RIM.cx, RIM.cy + 4, RIM.rx, RIM.ry + 3, 180, 0)}Z`,
	rimGleams: [rimArc(116, 24, 196, 232), rimArc(116, 24, 152, 128)].join(''),
	bubbles: [
		{ x: 224, y: 151, radius: 6.4 },
		{ x: 296, y: 149, radius: 4.6 },
		{ x: 262, y: 139, radius: 3.8 },
		{ x: 246, y: 157, radius: 2.8 }
	],
	steamPaths: [
		'M222 128C210 114 230 104 220 90C212 79 222 70 226 64',
		'M262 124C250 108 272 98 262 82C255 71 266 62 270 56',
		'M302 128C290 114 310 104 300 90C292 79 302 70 306 64'
	]
} as const;

/* ------------------------------------------------------------ The scenes */

/**
 * The diving board stands to the left of the pot, in the units of the ingredient once it is in the
 * pot (centered on 0 0): the ingredient walks on it before diving.
 */
export const DIVING_BOARD = {
	plankPath:
		'M-246 -41.6L-150 -41.6Q-144 -41.6 -144 -38Q-144 -34.4 -150 -34.4L-246 -34.4Q-250 -34.4 -250 -38Q-250 -41.6 -246 -41.6Z',
	stripePath: 'M-246 -39.6L-150 -39.6L-150 -37.4L-246 -37.4Z',
	postPath: 'M-242 -34.4L-232 -34.4L-232 64L-242 64Z',
	footPath: 'M-250 62Q-250 60 -248 60L-226 60Q-224 60 -224 62L-224 66L-250 66Z',
	rollerPath: ovalPath(-205, -30.6, 4.2, 4.2),
	gleam: 'M-244 -40L-196 -40',
	postGleam: 'M-239.4 -30L-239.4 58'
} as const;

/** Drops thrown up by an ingredient that dives into the soup: directions in degrees, from the soup. */
export const SPLASH = {
	center: { x: 260, y: 156 },
	dropPath:
		'M251 156C255 152.6 258 151 262 151C265.6 151 268 153.4 268 156C268 158.6 265.6 161 262 161C258 161 255 159.4 251 156Z',
	glintPath: ovalPath(263.4, 154.2, 1.6, 1.1),
	angles: [-160, -120, -60, -20]
} as const;

/** The big bubble the pot burps once it has swallowed an ingredient. */
export const BURP_BUBBLE = {
	cx: 260,
	cy: 138,
	r: 26,
	shinePath:
		'M243.6 127C246 119.6 252 115 259 114C254 118 250.6 122.6 249 128.4C248.4 130.6 243 129.6 243.6 127Z',
	glint: ovalPath(276, 151, 2.6, 1.8)
} as const;

const LADLE_HANDLE = capsulePath(476, 62.6, 314, 132.4, 3.6);

/**
 * The ladle the ingredient slides down (scene units), on the right: the top left corner is kept
 * for the speech bubble. Its handle leans on the rim, its bowl in the soup.
 */
export const LADLE = {
	handlePath: LADLE_HANDLE,
	handleShade: shadeOf(LADLE_HANDLE, 0, 1.6),
	hookPath: 'M473 59C478 52 487 53 488 60C489 66 484 70 480 68',
	bowlPath: ovalPath(298, 142, 22, 6),
	bowlInside: ovalPath(298, 142.6, 18, 4.2),
	gleam: 'M330 120.6L460 52.2'
} as const;

const SPOON_HANDLE =
	'M47 204.6C64 203.6 90 201.6 108 200.4C112 200.2 113 204.2 109 204.8C90 206.6 64 208.2 47 209Z';
const SPOON_BOWL = 'M10 204C10 213 20 217 30 217C40 217 50 212 50 204Z';

/** The spoon that throws the ingredient, on the counter left of the pot (scene units). */
export const CATAPULT = {
	pivotPath: 'M57 218L64 205.6Q66 202.6 68 205.6L75 218Q76 220 74 220L58 220Q56 220 57 218Z',
	handlePath: SPOON_HANDLE,
	handleShade: shadeOf(SPOON_HANDLE, 0, 1.4),
	bowlPath: SPOON_BOWL,
	bowlShade: shadeOf(SPOON_BOWL, 4, 3),
	hollowPath: ovalPath(30, 204, 20, 3.6),
	gleam: 'M60 204.4L98 202.4'
} as const;

const NAPKIN_CANOPY =
	'M-40 -56C-40 -76 -22 -86 0 -86C22 -86 40 -76 40 -56Q30 -62 20 -56Q10 -62 0 -56Q-10 -62 -20 -56Q-30 -62 -40 -56Z';

/** The napkin parachute, above the ingredient (units of the ingredient in the pot). */
export const NAPKIN = {
	canopyPath: NAPKIN_CANOPY,
	checksPath: checkerPath(-42, -88, 11, 5, 8),
	canopyShade: shadeOf(NAPKIN_CANOPY, 6, 3),
	canopyLight:
		'M-30 -66C-30 -74 -20 -81 -10 -82.6C-17 -78 -22 -72 -24 -66C-24.6 -63.6 -30 -63.6 -30 -66Z',
	foldPaths: ['M-20 -56.6Q-23 -74 -11 -84.6', 'M20 -56.6Q23 -74 11 -84.6'],
	cordPaths: ['M-40 -56L-15 -30', 'M40 -56L15 -30', 'M0 -56L0 -32']
} as const;

const BALLOON_BODY =
	'M0 -42C-13 -44 -20 -54 -20 -62C-20 -71 -12 -76 0 -76C12 -76 20 -71 20 -62C20 -54 13 -44 0 -42Z';

const growBalloon = (d: string) => mapPath(d, (x, y) => [x * 1.2, -42 + (y + 42) * 1.2]);

/** The balloon the ingredient hangs from (units of the ingredient in the pot). */
export const BALLOON = {
	bodyPath: growBalloon(BALLOON_BODY),
	bodyShade: growBalloon(shadeOf(BALLOON_BODY, 5, 4)),
	shinePath: growBalloon(
		'M-13 -62C-13.6 -67 -10 -71.6 -5 -72.6C-8.6 -69.6 -10.2 -66.4 -10.4 -62.4C-10.6 -60.6 -12.8 -60.4 -13 -62Z'
	),
	glint: growBalloon(ovalPath(-6.6, -54.4, 1.4, 1)),
	knotPath: 'M-3.4 -38.6Q0 -43 3.4 -38.6Q0 -37.4 -3.4 -38.6Z',
	stringPath: 'M0 -38.4Q-4 -34 0 -30Q4 -26 0 -20'
} as const;

const LID_DOME = 'M136 158C138 140 190 127 260 127C330 127 382 140 384 158Z';
const LID_RIM =
	'M132 156.6Q132 154 136 154L384 154Q388 154 388 156.6L388 158.4Q388 161.4 384 161.4L136 161.4Q132 161.4 132 158.4Z';
const LID_KNOB = 'M247 128C246 121 250 116.4 260 116.4C270 116.4 274 121 273 128Z';

function lidEye(cx: number, cy: number, look: number) {
	return {
		white: ovalPath(cx, cy, 9, 10),
		iris: ovalPath(cx + look, cy + 2, 5.6, 6.2),
		pupil: ovalPath(cx + look, cy + 2.4, 3, 3.4),
		glint: ovalPath(cx + look + 1.8, cy - 0.6, 1.6, 1.6)
	};
}

/** Teeth along the bottom of the lid, pointing down. */
function teethPath(): string {
	const teeth: string[] = [];
	for (let x = 176; x <= 334; x += 14) {
		teeth.push(
			`M${pt(x, 160)}L${pt(x + 12, 160)}Q${pt(x + 9, 168)} ${pt(x + 6, 168.6)}Q${pt(x + 3, 168)} ${pt(x, 160)}Z`
		);
	}
	return teeth.join('');
}

/** The pot lid with eyes and teeth, hinged on its right end (scene units). */
export const LID = {
	domePath: LID_DOME,
	domeShade: shadeOf(LID_DOME, 12, 4),
	domeLight:
		'M152 151C158 142 180 134 208 131C186 136 168 143 160 152C158 154.6 150.6 153.6 152 151Z',
	rimPath: LID_RIM,
	knobPath: LID_KNOB,
	knobShade: shadeOf(LID_KNOB, 3, 2),
	knobStem: 'M255 128L265 128L264 130L256 130Z',
	teethPath: teethPath(),
	eyes: [lidEye(226, 142, -2), lidEye(294, 142, -3)],
	brows: [
		'M213 128.6Q224 123.4 237 127.4Q225 126.4 213.4 130.6Z',
		'M281 127.4Q294 122.4 306 128.4Q294 125.6 281.4 129.4Z'
	]
} as const;

/** The little arm the floating ingredient waves with (units of the ingredient in the pot). */
export const WAVING_ARM = {
	armPath: 'M20 -2C30 -6 36 -12 40 -22',
	glovePath:
		'M36.6 -24C35 -28.6 36.4 -33.4 40 -35C41 -38.4 44.6 -39 46 -36.6C47.6 -38.4 51 -37.6 51.4 -34.8C53.6 -34.6 54.8 -32 53.6 -30C53 -26 50 -22.6 45.6 -21.6C42 -20.8 38 -21.2 36.6 -24Z',
	fingers: 'M44 -36L44.8 -30.6M49.4 -34.6L48.6 -29.8',
	cuffPath: 'M34.6 -23.4C36.6 -19.6 42.6 -18.4 46 -21L44.4 -16.4C40.6 -14.6 35.4 -15.6 33.2 -19Z'
} as const;

/** The steam drawings above the pot (scene units), picked in turn: a heart, a star, a little dino. */
export const STEAM_SHAPES: readonly (readonly string[])[] = [
	[
		'M260 122C226 102 228 74 247 74C255 74 259 80 260 85C261 80 265 74 273 74C292 74 294 102 260 122Z',
		'M260 140Q252 132 260 126'
	],
	[
		'M260 72L267.6 91.5L288.5 92.7L272.4 106L277.6 126.3L260 115L242.4 126.3L247.6 106L231.5 92.7' +
			'L252.4 91.5Z',
		'M260 142Q252 136 260 130'
	],
	[
		'M222 118Q240 90 266 98L276 82Q280 72 292 74Q302 76 300 84Q298 91 284 91L283 104Q287 116 280 122' +
			'L280 128L273 128L272 121Q262 123 254 121L254 128L247 128L246 119Q234 121 222 118Z',
		'M288 81L289 82',
		'M250 142Q242 136 250 130'
	]
];

/** The humps of the wave that runs across the soup, left to right (scene units), with their foam. */
export const OLA_HUMPS: readonly {
	readonly hump: string;
	readonly shade: string;
	readonly foam: string;
}[] = [176, 210, 244, 278, 312].map((left) => {
	const hump = `M${left - 4} 162C${left + 6} 158 ${left + 6} 112 ${left + 16} 112C${left + 26} 112 ${left + 26} 158 ${left + 36} 162Z`;
	return {
		hump,
		shade: shadeOf(hump, 4, 0),
		foam: `M${left + 8.4} 121C${left + 10} 109 ${left + 22} 109 ${left + 23.6} 121C${left + 19} 117.6 ${left + 13} 117.6 ${left + 8.4} 121Z`
	};
});

/**
 * The baby dino of the visit, a baby of the eggs: `rest` is where its feet stand (scene units)
 * when the visit ends, `scale` its size. It is drawn in the box of the eggs (120 x 150), its feet
 * moved up under its body, a tail behind it.
 */
export const DINO = {
	rest: { x: 54, y: 220 },
	scale: 0.6,
	/** From the box of the eggs to the point between its feet. */
	origin: { x: -60, y: -137.6 },
	feetLift: -15.4,
	tailPath: 'M78 110C90 116 104 112 109 99C110.6 95 115.6 96 115.4 100.6C114.4 116 100 127 82 125Z',
	tailShade: 'M82 125C96 124 108 117 113 106C111 117 99 127 82 125Z',
	groundPath: ovalPath(60, 137, 30, 3.6)
} as const;

const ROCKET_BODY =
	'M-34 -12C-10 -14.6 16 -14.6 28 -8.6C35.6 -4.6 40 -1.6 42 0C40 1.6 35.6 4.6 28 8.6C16 14.6 -10 14.6 -34 12C-38.6 8 -38.6 -8 -34 -12Z';
const ROCKET_FIN = 'M-22 -12C-28 -20 -36 -27 -46 -27C-46 -20 -44 -14 -38 -8Z';

/**
 * The little rocket of the delivery (nose right, centered on 0 0), at `rest` when it lets go: it
 * flies level, a claw under its belly holds the ingredient, the pot is under the ingredient.
 */
export const DELIVERY_ROCKET = {
	rest: { x: 194, y: 102 },
	bodyPath: ROCKET_BODY,
	bodyShade: shadeOf(ROCKET_BODY, 0, 5),
	bodyLight:
		'M-26 -8.4C-8 -10.6 12 -10.4 24 -6.6C12 -8 -8 -8 -26 -5.6C-28.4 -5.4 -28.6 -8.2 -26 -8.4Z',
	nosePath: 'M24 -10.6C34 -5.6 40 -1.6 42 0C40 1.6 34 5.6 24 10.6C27 4 27 -4 24 -10.6Z',
	bandPath: 'M-14 -13.8C-12 -6 -12 6 -14 13.8L-20 13.4C-18 6 -18 -6 -20 -13.4Z',
	finPaths: [ROCKET_FIN, mapPath(ROCKET_FIN, (x, y) => [x, -y])],
	nozzlePath: 'M-35.6 -7.6L-42 -9.4Q-44 -9.4 -44 -7.4L-44 7.4Q-44 9.4 -42 9.4L-35.6 7.6Z',
	window: ovalPath(6, -1, 7, 7),
	windowFrame: ovalPath(6, -1, 9.2, 9.2),
	windowGleam: 'M1.4 -3C2 -5.6 4 -7 6.4 -7.2C4.6 -5.6 3.6 -4 3.4 -2.2C3.2 -1 1.2 -1.6 1.4 -3Z',
	flameOuterPath: 'M-44 -6.6C-54 -8 -64 -4 -72 0C-64 4 -54 8 -44 6.6Z',
	flameInnerPath: 'M-44 -3.4C-50 -4 -56 -2 -60 0C-56 2 -50 4 -44 3.4Z',
	rodPath: 'M27.4 9L32.6 9L32.6 20L27.4 20Z',
	clawPaths: [
		'M30 18.6C24 18.6 18 23 18.4 30.6C18.6 33 21.4 33 21.6 30.6C22 26 25.4 23.4 30 23.4Z',
		'M30 18.6C36 18.6 42 23 41.6 30.6C41.4 33 38.6 33 38.4 30.6C38 26 34.6 23.4 30 23.4Z'
	],
	hubPath: ovalPath(30, 20.6, 4, 3.4)
} as const;

const NECK = 'M0 -19C-70 -17.6 -150 -13.4 -224 -11.4L-224 11.4C-150 13 -70 16 0 19Z';

/** The mane along the top of the neck, a row of tufts. */
function manePath(): string {
	const top = (x: number) => -19 + (-x / 224) * 7.6;
	let path = `M${pt(4, top(0) + 6)}L${pt(2, top(0) - 1)}`;
	for (let x = 0; x > -210; x -= 14) {
		path += `Q${pt(x - 6, top(x - 7) - 9)} ${pt(x - 14, top(x - 14) - 1)}`;
	}
	return `${path}L${pt(-210, top(-210) + 6)}Z`;
}

/**
 * The giraffe that leans in from the right edge, through the window (scene units). Its neck points
 * along -x from the shoulder (0 0); `transform` places and tilts it so the mouth ends over the pot.
 * The neck grows from the edge and the head slides with it. The ingredient it holds is drawn in the
 * neck frame (`heldTransform` cancels the tilt).
 */
export const GIRAFFE = {
	transform: 'translate(548 62) rotate(-8.53)',
	neckPath: NECK,
	neckShade: shadeOf(NECK, 0, 6),
	neckLight: 'M-20 -12.6C-80 -12 -150 -9 -210 -7C-150 -6.4 -80 -8.6 -20 -9.6Z',
	manePath: manePath(),
	spots: [
		blob(-26, -2, 8.6, 7, 10),
		blob(-62, 7, 7.6, 6.4, 40),
		blob(-96, -5, 8, 6, 0),
		blob(-132, 5, 7, 5.6, 25),
		blob(-166, -4, 6.6, 5.2, 50),
		blob(-198, 4, 5.6, 4.6, 15),
		blob(-44, 15, 5, 3.4, 30),
		blob(-114, -12, 5.4, 3.4, 0)
	],
	headTransform: 'translate(-222 0) rotate(-12)',
	headPath:
		'M10 -12C4 -22 -16 -23 -30 -18C-42 -14 -54 -11 -60 -4C-64 1 -61 9 -53 11C-40 15 -18 17 2 12C12 9.6 15 -4 10 -12Z',
	headShade: 'M10 -12C15 -4 12 9.6 2 12C-18 17 -40 15 -53 11C-38 12 -16 12 0 7C8 4.4 11 -4 10 -12Z',
	headLight:
		'M-6 -17C-14 -18.6 -24 -17.4 -31 -14.6C-24 -15.4 -14 -15.6 -7 -14.4C-5.4 -14.2 -4.4 -16.6 -6 -17Z',
	snoutPath:
		'M-44 -12.6C-52 -10.6 -58 -7.6 -60 -4C-64 1 -61 9 -53 11C-48 12.4 -42 13 -37 13C-40 4 -41 -5 -44 -12.6Z',
	nostril: 'M-56 -3.4C-55 -5.4 -52.4 -5.4 -52.4 -3.6C-52.4 -2 -55.4 -1.6 -56 -3.4Z',
	mouthPath: 'M-58 5.6C-54 8.6 -46 9 -40 6.6',
	earPath: 'M4 -14C8 -24 16 -30 24 -30C22 -22 16 -14 8 -10Z',
	earInner: 'M8 -15C11 -21 15 -25 20 -26C18 -21 14 -16 10 -13Z',
	horns: [capsulePath(-6, -17, -8, -30, 2.2), capsulePath(-15, -18.6, -18.6, -30.6, 2.2)],
	hornTips: [ovalPath(-8.2, -31.4, 3.8, 3.4), ovalPath(-18.8, -32, 3.8, 3.4)],
	eye: {
		white: ovalPath(-24, -7.6, 5, 5.6),
		iris: ovalPath(-25.4, -7.2, 3.4, 4),
		pupil: ovalPath(-25.6, -7, 1.9, 2.3),
		glint: ovalPath(-24.4, -8.8, 1.2, 1.2)
	},
	lidPath: 'M-30 -11.4C-27 -15 -21 -15 -18.6 -11.4',
	lashes: 'M-29.4 -12.6L-31.6 -14.6M-26.4 -14.4L-27.4 -17M-22.6 -14.4L-22.2 -17',
	cheek: ovalPath(-32, 4.4, 4.4, 2.6),
	heldTransform: 'translate(-291.6 18.9) rotate(8.53) scale(0.8)'
} as const;
