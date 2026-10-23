/**
 * Drawing data of the train. Everything is drawn on the rail: x runs along the track, y is negative
 * above it, and 0 is the top of the rail where the wheels stand. Lit from the top left.
 *
 * Paths are written with absolute M, L, Q, C and Z commands in "x y" pairs, so that `shift` can
 * move them (a shade is a form minus a copy moved toward the light).
 */
import { capsulePath, crescentPath, ovalPath, roundedStarPath } from '$lib/ui/companion/geometry';

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Wheel extends Point {
	readonly radius: number;
}

/** A filled form with its volume: the shade away from the light and its lights, kept inside it. */
export interface Form {
	readonly d: string;
	readonly shade: string;
	readonly lights: readonly string[];
}

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/** The same path with every point moved by (dx, dy). */
export function shift(d: string, dx: number, dy: number): string {
	return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
		pt(Number(x) + dx, Number(y) + dy)
	);
}

/** The same path mirrored around x = 0. */
function mirrorX(d: string): string {
	return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
		pt(-Number(x), Number(y))
	);
}

/**
 * The shade of a form: the form and a copy moved toward the light, filled even-odd. Kept inside
 * the form by a clip, only the side away from the light stays.
 */
export function shadeOf(d: string, toward: number, down = toward): string {
	return d + shift(d, -toward, -down);
}

/** A rectangle with rounded corners. */
export function roundRect(x: number, y: number, width: number, height: number, r: number): string {
	const right = x + width;
	const bottom = y + height;
	return (
		`M${pt(x + r, y)}L${pt(right - r, y)}Q${pt(right, y)} ${pt(right, y + r)}` +
		`L${pt(right, bottom - r)}Q${pt(right, bottom)} ${pt(right - r, bottom)}` +
		`L${pt(x + r, bottom)}Q${pt(x, bottom)} ${pt(x, bottom - r)}` +
		`L${pt(x, y + r)}Q${pt(x, y)} ${pt(x + r, y)}Z`
	);
}

function form(d: string, shade: string, lights: readonly string[] = []): Form {
	return { d, shade, lights };
}

/** A band across a form, from `top` to `bottom`, wider than any form it is clipped to. */
function band(left: number, right: number, top: number, bottom: number): string {
	return `M${pt(left, top)}L${pt(right, top)}L${pt(right, bottom)}L${pt(left, bottom)}Z`;
}

/** A four-pointed sparkle around (cx, cy). */
export function sparklePath(cx: number, cy: number, r: number): string {
	const k = r * 0.16;
	return (
		`M${pt(cx, cy - r)}Q${pt(cx + k, cy - k)} ${pt(cx + r, cy)}Q${pt(cx + k, cy + k)} ${pt(cx, cy + r)}` +
		`Q${pt(cx - k, cy + k)} ${pt(cx - r, cy)}Q${pt(cx - k, cy - k)} ${pt(cx, cy - r)}Z`
	);
}

/* ---------------------------------------------------------------- Wheels */

/** A wheel drawn around (0, 0): what turns (spokes, crank) and what stays (tyre, light). */
export interface WheelArt {
	readonly tyre: string;
	/** The dark space between the spokes. */
	readonly well: string;
	readonly spokes: string;
	/** The rim inside the tyre, a ring. */
	readonly rim: string;
	readonly hub: string;
	readonly boss: string;
	/** The weight opposite the crank, on a driving wheel. */
	readonly counterweight: string;
	readonly shade: string;
	readonly light: string;
}

function spokesPath(r: number, count: number, inner: number, outer: number): string {
	return Array.from({ length: count }, (_, i) => {
		const angle = (i * 2 * Math.PI) / count;
		const at = (radius: number, half: number): string => {
			const nx = -Math.sin(angle) * half;
			const ny = Math.cos(angle) * half;
			return pt(radius * Math.cos(angle) + nx, radius * Math.sin(angle) + ny);
		};
		const atNeg = (radius: number, half: number): string => {
			const nx = Math.sin(angle) * half;
			const ny = -Math.cos(angle) * half;
			return pt(radius * Math.cos(angle) + nx, radius * Math.sin(angle) + ny);
		};
		return `M${at(inner, r * 0.09)}L${at(outer, r * 0.06)}L${atNeg(outer, r * 0.06)}L${atNeg(inner, r * 0.09)}Z`;
	}).join('');
}

export function wheelArt(r: number, spokes: number, driver: boolean): WheelArt {
	const tyre = ovalPath(0, 0, r, r);
	const rimOuter = r * 0.8;
	const rimInner = r * 0.68;
	return {
		tyre,
		well: ovalPath(0, 0, rimOuter, rimOuter),
		spokes: spokesPath(r, spokes, r * 0.2, rimInner + r * 0.04),
		rim: ovalPath(0, 0, rimOuter, rimOuter) + ovalPath(0, 0, rimInner, rimInner),
		hub: ovalPath(0, 0, r * 0.28, r * 0.28),
		boss: ovalPath(0, 0, r * 0.12, r * 0.12),
		counterweight: driver ? crescentPath(0, 0, rimInner * 0.92, 200, 250, r * 0.16) : '',
		shade: shadeOf(tyre, r * 0.2),
		light: crescentPath(0, 0, r * 0.9, 195, 255, r * 0.05)
	};
}

/* ---------------------------------------------------------------- Locomotive */

const CAB = 'M0 -60L30 -60L30 -21L0 -21Z';
const ROOF =
	'M-4.5 -60L-4.5 -63Q-4.5 -64.6 -3 -64.9Q15 -68.6 33 -64.9Q34.5 -64.6 34.5 -63L34.5 -60Z';
const BOILER = 'M28 -50L78 -50L78 -21L28 -21Z';
const SMOKEBOX = 'M77 -51.5L89 -51.5Q95.5 -51.5 95.5 -36Q95.5 -20.5 89 -20.5L77 -20.5Z';
const CHIMNEY = 'M79 -50.5Q82.5 -50.5 82.5 -55L82.5 -69L89.5 -69L89.5 -55Q89.5 -50.5 93 -50.5Z';
const DOME = 'M48 -49.5Q52 -50 52.5 -54Q53 -60.5 57 -60.5Q61 -60.5 61.5 -54Q62 -50 66 -49.5Z';
const WHISTLE =
	'M33 -49.5Q35.6 -50 35.8 -53L35.8 -55L34.6 -55L34.6 -60.5Q34.6 -61.6 35.6 -61.6L38.4 -61.6Q39.4 -61.6 39.4 -60.5L39.4 -55L38.2 -55L38.2 -53Q38.4 -50 41 -49.5Z';
const FOOTPLATE = roundRect(-2, -21.5, 98, 4.5, 1.2);
const COWCATCHER = 'M91 -17L100 -17L108 -1.5Q108.4 0 107 0L91 0Z';
const CYLINDER = roundRect(63, -26.5, 15, 12, 2.4);

/** The wheels of the locomotive: two big driving wheels, a small one in front. */
const LOCO_WHEELS = [
	{ x: 18, y: -11, radius: 11 },
	{ x: 44, y: -11, radius: 11 },
	{ x: 84, y: -6.5, radius: 6.5 }
] satisfies readonly Wheel[];

export const LOCO = {
	/** Front of the cowcatcher. */
	width: 108,
	/** Top of the chimney. */
	height: 73,
	frame: roundRect(2, -17, 90, 7, 1.2),
	/** The forms that make one body, joined without an outline between them. */
	body: {
		footplate: form(FOOTPLATE, band(-3, 97, -18.6, -16), [band(0, 94, -21, -20.2)]),
		boiler: form(BOILER, `M28 -30Q53 -27.6 78 -30L78 -21L28 -21Z`, [band(31, 77, -47, -44.6)]),
		smokebox: form(SMOKEBOX, shadeOf(SMOKEBOX, 3, 2.4), [roundRect(80, -49, 9, 1.8, 0.9)]),
		chimney: form(CHIMNEY, band(87.4, 94, -70, -50), [band(83.6, 84.8, -67, -54)]),
		dome: form(DOME, shadeOf(DOME, 1.6), [ovalPath(54.8, -56.4, 1, 1.8)]),
		whistle: form(WHISTLE, band(37.6, 42, -62, -49), [band(35.4, 36.2, -60.6, -56)]),
		cab: form(CAB, `${band(-1, 31, -60, -56.6)}${band(-1, 31, -26.4, -21)}`, [
			band(1.2, 2.4, -55, -28)
		]),
		roof: form(ROOF, band(-5, 35, -61.6, -60), [
			'M-2.6 -64.2Q15 -67.6 31 -64.4Q15 -66.4 -2.6 -63.2Z'
		])
	},
	/** Brass cap on top of the chimney. */
	chimneyCap: form(roundRect(80.5, -73, 11, 4.6, 1.4), band(80, 92, -70, -68), [
		band(82, 86, -72.2, -71.4)
	]),
	/** Where the cab meets the boiler: a seam, not an outline. */
	seams: 'M30 -60L30 -21.5',
	window: roundRect(7, -55, 15, 16, 2.6),
	windowGlints: [
		'M10.6 -53.4L14.4 -53.4L10.2 -42.6L8.6 -42.6L8.6 -48.6Z',
		'M16.4 -53.4L17.8 -53.4L13.4 -42.6L12 -42.6Z'
	],
	/** The gold line painted on the cab under the window, and on the boiler bands. */
	lining: roundRect(4, -35, 22, 10, 1.6),
	bands: [
		roundRect(43, -50.2, 2.4, 29.4, 0.6),
		roundRect(66, -50.2, 2.4, 29.4, 0.6),
		roundRect(75.8, -51.6, 2.6, 31.2, 0.8)
	],
	handrail: 'M31 -39L75 -39',
	rivets: [
		...[-47, -42.5, -38, -33.5, -29, -24.5].map((y) => ({ x: 80.2, y, radius: 0.55 })),
		...[-56, -47, -38, -29].map((y) => ({ x: 27.6, y, radius: 0.55 })),
		...[-56, -47, -38, -29].map((y) => ({ x: 2.6, y, radius: 0.55 }))
	] satisfies readonly Wheel[],
	bufferBeam: form(roundRect(90, -23.5, 9, 6.5, 1.2), band(89, 100, -19.4, -17), [
		band(91.4, 97.6, -22.8, -22)
	]),
	cowcatcher: form(COWCATCHER, shadeOf(COWCATCHER, 1.6), []),
	cowcatcherSlats:
		'M94.5 -16.6L95 -0.6M98 -16.6L99.4 -0.6M100.8 -14.4L103.8 -0.6M103 -10L106.4 -0.8',
	rearBuffer: {
		stock: roundRect(-3, -21.6, 3.4, 5.2, 0.8),
		head: ovalPath(-3, -19, 1.1, 3.6)
	},
	rearHook: 'M-0.5 -13L2 -13',
	cylinder: form(CYLINDER, band(62, 79, -18.6, -14), [band(65, 76, -25.4, -24.2)]),
	cylinderCovers: 'M66 -26.2L66 -14.8M75 -26.2L75 -14.8',
	slideBar: 'M52 -23.4L63.4 -23.4',
	crosshead: roundRect(54.6, -25.4, 5.6, 4, 0.8),
	couplingRod: capsulePath(22.6, -7, 48.6, -7, 1.4),
	connectingRod: capsulePath(57.4, -23.4, 48.6, -7, 1.3),
	crankPins: [
		{ x: 22.6, y: -7, radius: 1.3 },
		{ x: 48.6, y: -7, radius: 1.3 }
	] satisfies readonly Wheel[],
	lamp: {
		housing: form(roundRect(93.6, -47, 6, 8.4, 1.6), band(97.6, 101, -48, -38), [
			band(94.6, 95.4, -45.6, -40.4)
		]),
		hood: 'M93 -47.4L100.4 -47.4',
		lens: ovalPath(99.8, -42.8, 1.3, 2.9)
	},
	wheels: LOCO_WHEELS,
	/** The chimney and the middle of its top, where the smoke starts. */
	chimney: { x: 86, top: -73 },
	/** A small cloud above the chimney while the train waits. */
	idlePuff: [
		{ x: 85, y: -82, radius: 4 },
		{ x: 90.6, y: -86.4, radius: 5 },
		{ x: 83.4, y: -91, radius: 5.4 },
		{ x: 90, y: -95, radius: 3.8 }
	] satisfies readonly Wheel[]
} as const;

/* ---------------------------------------------------------------- Wagons */

/** Number of body colours: the wagons follow one another in this order, then start over. */
export const WAGON_TONES = 6;

/** Number of different loads. */
export const CARGO_KINDS = 6;

/** Tones of the loads, each one a colour token of the drawing. */
export const CARGO_TONES = 4;

const WAGON_BODY = roundRect(0, -41.5, 54, 26.5, 1.2);
const RIM = roundRect(-1.5, -44.6, 57, 3.8, 1.2);
const STANCHION_X = [0, 25.7, 51.4] as const;

export const WAGON = {
	width: 54,
	/** Distance between two wagons, hitch included. */
	pitch: 62,
	/** Top of the side of the wagon. */
	bodyTop: -44.6,
	/** Highest point of a wagon with its load. */
	height: 60,
	wheelRadius: 7,
	body: form(WAGON_BODY, `${band(-1, 55, -41.5, -39)}${band(-1, 55, -21, -15)}`, [
		band(4, 24, -37.6, -36.6),
		band(29.4, 49.4, -37.6, -36.6)
	]),
	planks: 'M3 -34.6L51 -34.6M3 -28L51 -28M3 -21.4L51 -21.4',
	rim: form(RIM, band(-2, 56, -42.4, -40.8), [band(0.6, 53.4, -43.9, -43.1)]),
	stanchions: STANCHION_X.map((x) =>
		form(roundRect(x, -41.5, 2.6, 26.5, 0.6), band(x + 1.7, x + 3, -42, -14), [
			band(x + 0.5, x + 1, -40, -17)
		])
	),
	rivets: STANCHION_X.flatMap((x) =>
		[-37.6, -28.4, -19.2].map((y) => ({ x: x + 1.3, y, radius: 0.5 }))
	) satisfies readonly Wheel[],
	solebar: form(roundRect(-1, -15.4, 56, 5, 1), band(-2, 56, -12, -10), [band(1, 53, -14.6, -14)]),
	buffers: [-3, 57].map((x) => ({
		stock: roundRect(x < 0 ? -2.6 : 54, -21.2, 2.6, 4.4, 0.6),
		head: form(ovalPath(x, -19, 1.1, 3.5), shadeOf(ovalPath(x, -19, 1.1, 3.5), 0.5, 0.8), [])
	})),
	/** The chain to the next wagon, or to the locomotive. */
	hitchPath: 'M54.4 -13L61.6 -13',
	hitchLinks: [ovalPath(56.2, -13, 1.9, 1.1), ovalPath(59.8, -13, 1.9, 1.1)],
	springs: [13, 41].map(
		(x) =>
			`M${pt(x - 7.5, -12)}Q${pt(x, -6.8)} ${pt(x + 7.5, -12)}L${pt(x + 7.5, -10.6)}Q${pt(x, -5.2)} ${pt(x - 7.5, -10.6)}Z`
	),
	wheels: [
		{ x: 13, y: -7, radius: 7 },
		{ x: 41, y: -7, radius: 7 }
	] satisfies readonly Wheel[],
	/** The red lamp at the tail of the last wagon. */
	lamp: {
		bracketPath: 'M0.4 -31L-4 -31',
		housing: form(roundRect(-10.6, -37, 6.6, 10.4, 1.8), band(-6.2, -3, -38, -26), [
			band(-9.8, -9, -35.4, -28.4)
		]),
		handle: 'M-9.4 -37Q-7.3 -40.4 -5.2 -37',
		lens: { x: -7.4, y: -31.4, radius: 2.3 },
		glint: ovalPath(-8.2, -32.4, 0.7, 0.9)
	},
	/**
	 * An invisible box around everything a wagon can show: its animations are given in percent of
	 * its box, which must not change with the load (L-078).
	 */
	box: { x: -12, y: -92, width: 76, height: 92 }
} as const;

/** One piece of a load: a form, its painted parts kept inside it, its lines and what sticks out. */
export interface CargoItem {
	readonly kind: 'crate' | 'ball' | 'gift' | 'barrel' | 'apple' | 'star';
	readonly d: string;
	readonly shade: string;
	readonly lights: readonly string[];
	/** Painted parts inside the form (stripes, ribbon, hoops). */
	readonly spots: readonly string[];
	/** Fine lines on the form. */
	readonly detail: string;
	/** Parts that stick out of the form, each with its own outline (bow, stem, leaf). */
	readonly extras: readonly { readonly d: string; readonly paint: 'accent' | 'leaf' | 'wood' }[];
	readonly tone: number;
}

/** Where a load stands: a little below the top of the side, so that it sits in the wagon. */
const BASE = -42;

const SLOTS = [3, 15, 27, 39] as const;

function crate(x: number, height: number, tone: number): CargoItem {
	const top = BASE - height;
	const d = roundRect(x, top, 11.5, height, 0.8);
	return {
		kind: 'crate',
		d,
		shade: shadeOf(d, 1.8, 1.4),
		lights: [band(x + 1.2, x + 8.4, top + 0.8, top + 1.8)],
		spots: [],
		detail: `M${pt(x + 0.6, top + height / 2)}L${pt(x + 10.9, top + height / 2)}M${pt(x + 1.6, BASE - 1)}L${pt(x + 9.9, top + 1.2)}`,
		extras: [],
		tone
	};
}

function ball(x: number, tone: number): CargoItem {
	const cx = x + 5.75;
	const cy = BASE - 6.2;
	const d = ovalPath(cx, cy, 6.2, 6.2);
	return {
		kind: 'ball',
		d,
		shade: shadeOf(d, 1.8),
		lights: [ovalPath(cx - 2.6, cy - 3, 1.6, 1)],
		spots: [
			`M${pt(cx, cy - 6.4)}Q${pt(cx - 4.4, cy)} ${pt(cx, cy + 6.4)}Q${pt(cx + 4.4, cy)} ${pt(cx, cy - 6.4)}Z`
		],
		detail: '',
		extras: [],
		tone
	};
}

function gift(x: number, tone: number): CargoItem {
	const top = BASE - 10.5;
	const c = x + 5.75;
	const d = roundRect(x, top, 11.5, 10.5, 0.8);
	const loop = (side: number): string =>
		`M${pt(c, top)}C${pt(c + side * 1.4, top - 4.6)} ${pt(c + side * 5.6, top - 4)} ${pt(c + side * 4.2, top - 1.4)}C${pt(c + side * 3.4, top - 0.2)} ${pt(c + side * 1.4, top)} ${pt(c, top)}Z`;
	return {
		kind: 'gift',
		d,
		shade: shadeOf(d, 1.6, 1.2),
		lights: [band(x + 1, x + 3.6, top + 0.8, top + 1.6)],
		spots: [band(c - 1.1, c + 1.1, top - 1, BASE + 1), band(x - 1, x + 12.5, top + 4.2, top + 6)],
		detail: '',
		extras: [
			{ d: loop(-1), paint: 'accent' },
			{ d: loop(1), paint: 'accent' }
		],
		tone
	};
}

function barrel(x: number, tone: number): CargoItem {
	const top = BASE - 15.5;
	const d = `M${pt(x, BASE)}Q${pt(x - 1.8, BASE - 7.75)} ${pt(x, top)}L${pt(x + 11, top)}Q${pt(x + 12.8, BASE - 7.75)} ${pt(x + 11, BASE)}Z`;
	return {
		kind: 'barrel',
		d,
		shade: shadeOf(d, 1.8, 0.6),
		lights: [band(x + 1.4, x + 2.4, top + 2, BASE - 2)],
		spots: [band(x - 2, x + 13, top + 2.4, top + 4), band(x - 2, x + 13, BASE - 4, BASE - 2.4)],
		detail: `M${pt(x + 3.8, top + 0.4)}Q${pt(x + 3.2, BASE - 7.75)} ${pt(x + 3.8, BASE - 0.4)}M${pt(x + 7.2, top + 0.4)}Q${pt(x + 7.8, BASE - 7.75)} ${pt(x + 7.2, BASE - 0.4)}`,
		extras: [],
		tone
	};
}

function apple(x: number, tone: number): CargoItem {
	const cx = x + 5.75;
	const b = BASE;
	const d =
		`M${pt(cx, b - 10)}C${pt(cx + 2, b - 12)} ${pt(cx + 6, b - 11.4)} ${pt(cx + 6, b - 6.4)}` +
		`C${pt(cx + 6, b - 2)} ${pt(cx + 3, b)} ${pt(cx, b - 0.6)}C${pt(cx - 3, b)} ${pt(cx - 6, b - 2)} ${pt(cx - 6, b - 6.4)}` +
		`C${pt(cx - 6, b - 11.4)} ${pt(cx - 2, b - 12)} ${pt(cx, b - 10)}Z`;
	return {
		kind: 'apple',
		d,
		shade: shadeOf(d, 1.8),
		lights: [ovalPath(cx - 3, b - 7.4, 1, 1.8)],
		spots: [],
		detail: '',
		extras: [
			{ d: capsulePath(cx, b - 9.6, cx + 1.2, b - 13.2, 0.5), paint: 'wood' },
			{
				d: `M${pt(cx + 1, b - 11.6)}Q${pt(cx + 3.2, b - 15.2)} ${pt(cx + 6.2, b - 13.6)}Q${pt(cx + 3.8, b - 10.8)} ${pt(cx + 1, b - 11.6)}Z`,
				paint: 'leaf'
			}
		],
		tone
	};
}

function star(x: number, tone: number): CargoItem {
	const cx = x + 5.75;
	const cy = BASE - 7.4;
	const d = roundedStarPath(cx, cy, 8, 4.2, 5, 0.22);
	return {
		kind: 'star',
		d,
		shade: shadeOf(d, 1.6),
		lights: [`M${pt(cx, cy)}L${pt(cx - 1.4, cy - 6.4)}L${pt(cx - 2.4, cy - 1.4)}Z`],
		spots: [],
		detail: `M${pt(cx, cy - 1.6)}L${pt(cx, cy - 6)}M${pt(cx + 1.5, cy - 0.5)}L${pt(cx + 5.6, cy - 1.8)}`,
		extras: [],
		tone
	};
}

/** Four items each, so that the wave of a load can pass from one to the next. */
export const CARGOS: readonly (readonly CargoItem[])[] = [
	[crate(SLOTS[0], 12, 0), crate(SLOTS[1], 15, 1), crate(SLOTS[2], 12, 3), crate(SLOTS[3], 15, 0)],
	SLOTS.map((x, index) => ball(x, index % CARGO_TONES)),
	[gift(SLOTS[0], 1), gift(SLOTS[1], 0), gift(SLOTS[2], 3), gift(SLOTS[3], 1)],
	[barrel(SLOTS[0], 3), barrel(SLOTS[1], 1), barrel(SLOTS[2], 0), barrel(SLOTS[3], 3)],
	SLOTS.map((x, index) => apple(x, index % 2 === 0 ? 0 : 3)),
	SLOTS.map((x, index) => star(x, index % 2 === 0 ? 3 : 1))
];

/** Colour and load of the wagon of group `index`: fixed, never at random. */
export function wagonLook(index: number): { tone: number; cargo: number } {
	return {
		tone: index % WAGON_TONES,
		cargo: (index + Math.floor(index / WAGON_TONES)) % CARGO_KINDS
	};
}

/* ---------------------------------------------------------------- Scenes */

/**
 * The baby dinosaur of the eggs, standing in the wagon among the load: its drawing (box of
 * 120 x 150) is scaled down and placed so that its head shows above the side.
 */
export const PASSENGER = {
	transform: 'translate(-3 -90.5) scale(0.5)',
	/** Only what is above the side of the wagon shows. */
	clip: band(-40, 94, -120, -42)
} as const;

/** The little rocket on the load, drawn standing on (0, 0). */
const ROCKET_BODY =
	'M0 -40C6.6 -33 9 -24 9 -12L9 -2.4Q9 0 6.6 0L-6.6 0Q-9 0 -9 -2.4L-9 -12C-9 -24 -6.6 -33 0 -40Z';
const FIN = 'M-8.4 -14C-13 -11 -15.4 -5.6 -15.4 0.6Q-15.4 2 -14 1.6L-8.4 -0.6Z';

export const ROOF_ROCKET = {
	body: form(ROCKET_BODY, shadeOf(ROCKET_BODY, 3, 1), [
		'M-5 -26C-4.6 -30 -3.2 -33.4 -1.2 -35.6C-2.4 -31.6 -3 -27.6 -3 -23.6Z'
	]),
	/** The red nose and the band, painted on the body. */
	paint: [band(-10, 10, -45, -29.6), band(-10, 10, -8.4, -5.4)],
	window: {
		ring: ovalPath(0, -20, 4.6, 4.6),
		glass: ovalPath(0, -20, 3, 3),
		glint: ovalPath(-1, -21.2, 1, 0.8)
	},
	fins: [FIN, mirrorX(FIN)].map((d) => form(d, shadeOf(d, 1.4), [])),
	nozzle: roundRect(-5, -0.6, 10, 3.2, 1),
	flameOuterPath: 'M-5 2.6Q-6.4 9.6 0 18.6Q6.4 9.6 5 2.6Z',
	flameInnerPath: 'M-2.6 2.6Q-3.2 7.4 0 12.4Q3.2 7.4 2.6 2.6Z',
	/** Where it stands: on the load of the wagon. */
	seat: { x: 27, y: -58 },
	puffs: [
		{ x: -9, y: -1, radius: 4.6 },
		{ x: 0, y: -3, radius: 6 },
		{ x: 9, y: -1, radius: 4.6 }
	] satisfies readonly Wheel[]
} as const;

/** A cloud of steam in the shape of an exclamation mark, standing on (0, 0). */
const EXCLAMATION_BAR =
	'M-4.5 -12Q-10 -18 -8 -24Q-12 -30 -7 -35Q-6 -45 0 -45Q6 -45 7 -35Q12 -30 8 -24Q10 -18 4.5 -12Q0 -8 -4.5 -12Z';

export const EXCLAMATION = {
	bar: form(EXCLAMATION_BAR, shadeOf(EXCLAMATION_BAR, 2.4), [
		'M-4.4 -36Q-3.6 -41.6 -0.6 -42.6Q-2.6 -39 -2.8 -34.4Z'
	]),
	dot: form(ovalPath(0, -1, 5.5, 5.5), shadeOf(ovalPath(0, -1, 5.5, 5.5), 1.6), [
		ovalPath(-1.8, -2.8, 1.2, 0.9)
	]),
	wisps: [
		{ x: -14, y: -26, radius: 3.5 },
		{ x: 15, y: -34, radius: 3 },
		{ x: 13, y: -16, radius: 2.5 }
	] satisfies readonly Wheel[]
} as const;

/** The hill with the mouth of the tunnel, at the left of the place of a wagon. */
const HILL =
	'M-100 0L-100 -26C-96 -58 -74 -84 -46 -86C-30 -87 -20 -82 -16 -74L-16 -56L-19 -56L-19 0Z';
const ARCH =
	'M-20 -56C-20 -72 -11 -80 -1 -80C9 -80 18 -72 18 -56L12.6 -56C12.6 -68 6 -74.6 -1 -74.6C-8 -74.6 -14.6 -68 -14.6 -56Z';
const PIER = roundRect(-20.4, -56.6, 6.4, 56.6, 0.8);

export const TUNNEL = {
	hill: form(HILL, shadeOf(HILL, 9, 4), ['M-90 -36Q-84 -62 -64 -76Q-80 -58 -84 -34Z']),
	/** Rock showing through the grass of the hill. */
	rocks: [
		'M-96 -4Q-96 -18 -84 -20Q-74 -22 -70 -12Q-66 -4 -72 0L-96 0Z',
		'M-52 -40Q-50 -50 -40 -50Q-30 -50 -30 -42Q-30 -34 -40 -34Q-50 -34 -52 -40Z',
		'M-44 0Q-44 -10 -36 -12Q-26 -13 -24 -4L-24 0Z'
	],
	rockCracks: 'M-86 -14L-80 -8M-42 -46L-36 -42M-34 -8L-30 -4',
	/** Grass on the top of the hill. */
	tufts:
		'M-80 -66L-79 -71M-77 -68L-74.6 -72.6M-56 -82L-55.4 -87M-52 -83L-50 -87.6M-34 -84L-33.6 -88.4',
	arch: form(ARCH, shadeOf(ARCH, -1.4, 1.4), []),
	archJoints:
		'M-17.4 -66.4L-12.6 -64.4M-10.4 -76L-7.4 -71.8M-1 -80L-1 -74.6M8.6 -76L5.6 -71.8M15.8 -66.4L11 -64.4',
	pier: form(PIER, band(-16.4, -13, -58, 1), []),
	pierJoints:
		'M-20 -45L-14.4 -45M-20 -33L-14.4 -33M-20 -21L-14.4 -21M-20 -9L-14.4 -9M-17.6 -45L-17.6 -33M-16.8 -21L-16.8 -9M-17.2 -56L-17.2 -45M-18 -33L-18 -21',
	mouth: 'M-15 0L-15 -56C-15 -68 -8.6 -75 -1 -75C6.6 -75 13 -68 13 -56L13 0Z'
} as const;

/** Small clouds of dust behind a wheel that brakes. */
export const BRAKE_DUST: readonly Wheel[] = [
	{ x: -5, y: -3, radius: 3.2 },
	{ x: -10.5, y: -5.4, radius: 4 },
	{ x: -16.5, y: -3, radius: 2.8 }
];

/** Sparkles that flash where two wagons meet, around the buffers (58, -19). */
export const HOOK_SPARKS: readonly string[] = [
	sparklePath(58, -30, 4.4),
	sparklePath(65, -25, 3),
	sparklePath(51.6, -26.6, 2.6)
];

/** Clouds of the departure, from the first to the last. */
export const SMOKE_PUFFS: readonly (readonly Wheel[])[] = [
	[
		{ x: 0, y: 0, radius: 8 },
		{ x: 8.6, y: -5, radius: 6.4 },
		{ x: -7.4, y: -5, radius: 5.6 },
		{ x: 1, y: -9.6, radius: 6.4 }
	],
	[
		{ x: 0, y: 0, radius: 10 },
		{ x: 10.6, y: -6, radius: 7.6 },
		{ x: -9.4, y: -6, radius: 6.6 },
		{ x: 1, y: -11.6, radius: 7.6 }
	],
	[
		{ x: 0, y: 0, radius: 12 },
		{ x: 12.6, y: -7, radius: 8.6 },
		{ x: -11.4, y: -7, radius: 7.6 },
		{ x: 1, y: -13.4, radius: 8.6 }
	],
	[
		{ x: 0, y: 0, radius: 13.4 },
		{ x: 13.8, y: -8, radius: 9.6 },
		{ x: -12.6, y: -8, radius: 8.6 },
		{ x: 1, y: -14.6, radius: 9.6 }
	]
];

/* ---------------------------------------------------------------- Landscape */

const FAR_HILLS =
	'M-30 202L-30 156Q-20 140 -2 146Q60 112 130 130Q190 146 252 122Q330 92 410 126Q468 150 522 134Q540 128 550 140L550 202Z';
const NEAR_HILLS =
	'M-30 204L-30 184Q-20 176 -2 176Q80 150 178 174Q270 196 362 168Q440 146 522 166Q540 170 550 176L550 204Z';
const SUN = ovalPath(484, 40, 13, 13);
const STATION_WALL = roundRect(14, 166, 50, 30, 1);
const STATION_ROOF =
	'M6 168Q6 166.6 7.2 165.8L37.6 144.6Q39 143.6 40.4 144.6L70.8 165.8Q72 166.6 72 168L72 170L6 170Z';

/** A round tree standing on (x, y), `size` its height. */
function tree(x: number, y: number, size: number): { trunk: string; crown: Form } {
	const k = size / 40;
	const crown =
		`M${pt(x, y - 40 * k)}C${pt(x + 9 * k, y - 40 * k)} ${pt(x + 13 * k, y - 32 * k)} ${pt(x + 12 * k, y - 25 * k)}` +
		`C${pt(x + 16 * k, y - 21 * k)} ${pt(x + 14 * k, y - 11 * k)} ${pt(x + 6 * k, y - 11 * k)}L${pt(x - 6 * k, y - 11 * k)}` +
		`C${pt(x - 14 * k, y - 11 * k)} ${pt(x - 16 * k, y - 21 * k)} ${pt(x - 12 * k, y - 25 * k)}` +
		`C${pt(x - 13 * k, y - 32 * k)} ${pt(x - 9 * k, y - 40 * k)} ${pt(x, y - 40 * k)}Z`;
	return {
		trunk: `M${pt(x - 1.8 * k, y)}L${pt(x - 1.2 * k, y - 13 * k)}L${pt(x + 1.2 * k, y - 13 * k)}L${pt(x + 1.8 * k, y)}Z`,
		crown: form(crown, shadeOf(crown, 3 * k, 2 * k), [
			ovalPath(x - 5 * k, y - 31 * k, 2.4 * k, 1.6 * k)
		])
	};
}

/** The landscape behind the rails, in scene units. */
export const LANDSCAPE = {
	farHills: form(FAR_HILLS, shadeOf(FAR_HILLS, 10, 5), []),
	nearHills: form(NEAR_HILLS, shadeOf(NEAR_HILLS, 12, 5), []),
	/** Trees on the far hills, above the top of the train. */
	trees: [tree(150, 137, 18), tree(298, 113, 21), tree(316, 110, 15), tree(470, 145, 17)],
	sun: form(SUN, shadeOf(SUN, 3), [ovalPath(479, 35, 3, 2)]),
	sunHalo: ovalPath(484, 40, 21, 21),
	clouds: [
		[
			{ x: 150, y: 98, radius: 9 },
			{ x: 163, y: 91, radius: 12 },
			{ x: 178, y: 96, radius: 9.6 },
			{ x: 190, y: 100, radius: 6 }
		],
		[
			{ x: 318, y: 88, radius: 7.4 },
			{ x: 330, y: 82, radius: 10 },
			{ x: 344, y: 87, radius: 7.6 }
		]
	] satisfies readonly (readonly Wheel[])[],
	poles: [192, 398].map((x) => ({
		pole: roundRect(x, 126, 3.2, 78, 0.8),
		arm: roundRect(x - 6, 130, 15.2, 2.6, 0.8),
		insulators: [ovalPath(x - 4, 128.6, 1.2, 1.4), ovalPath(x + 7.2, 128.6, 1.2, 1.4)]
	})),
	wires: 'M-2 134Q90 142 188 128.6M199.2 128.6Q300 140 394 128.6M405.2 128.6Q462 136 522 132',
	station: {
		platform: form(roundRect(0, 194, 80, 10, 1), band(-1, 81, 200, 205), [
			band(2, 78, 194.8, 195.8)
		]),
		wall: form(STATION_WALL, `${band(56, 65, 165, 197)}${band(13, 65, 170, 173)}`, []),
		roof: form(STATION_ROOF, shadeOf(STATION_ROOF, -4, 3), []),
		roofTiles: 'M14 162L64 162M22 156L56 156M30 150.4L48 150.4',
		clock: ovalPath(39, 157, 4.4, 4.4),
		clockHands: 'M39 157L39 154.2M39 157L41 158',
		door: form(roundRect(33, 178, 12, 18, 1), band(41, 46, 177, 197), []),
		windows: [roundRect(18.6, 176, 10, 10, 1.4), roundRect(49.4, 176, 10, 10, 1.4)],
		windowBars: 'M23.6 176.4L23.6 185.6M18.8 181L28.4 181M54.4 176.4L54.4 185.6M49.6 181L59.2 181'
	},
	/** Little stones of the ballast, along the track. */
	pebbles: Array.from({ length: 26 }, (_, i) => {
		const x = i * 20 + 6 + (i % 3) * 4;
		const y = 214 + (i % 2) * 4;
		return ovalPath(x, y, 1.6, 1);
	}).join(''),
	grassTufts: Array.from({ length: 13 }, (_, i) => {
		const x = i * 40 + 14;
		const y = 232;
		return `M${pt(x, y)}L${pt(x - 2, y - 5)}M${pt(x + 2, y)}L${pt(x + 2.6, y - 6)}M${pt(x + 4, y)}L${pt(x + 6.4, y - 4)}`;
	}).join('')
} as const;

/** The rails, in scene units. */
export const TRACK = {
	y: 204,
	railHeight: 4,
	tieY: 207,
	tieWidth: 12,
	tieHeight: 5,
	tieSpacing: 20,
	ballastTop: 206,
	ballastBottom: 224,
	groundHeight: 36
} as const;
