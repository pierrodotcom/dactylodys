/**
 * Drawing data of the train. Everything is drawn on the rail: x runs along the track, y is negative
 * above it, and 0 is the top of the rail where the wheels stand.
 */

export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Wheel extends Point {
	readonly radius: number;
}

/** Number of body colours: the wagons follow one another in this order, then start over. */
export const WAGON_TONES = 6;

/** Number of different loads. */
export const CARGO_KINDS = 6;

/** Tones of the loads, each one a colour token of the drawing. */
export const CARGO_TONES = 4;

export const WAGON = {
	width: 54,
	/** Distance between two wagons, hitch included. */
	pitch: 62,
	bodyTop: -44,
	/** Highest point of a wagon with its load. */
	height: 66,
	wheelRadius: 7,
	bodyPath: 'M0 -40Q0 -44 4 -44L50 -44Q54 -44 54 -40L54 -12L0 -12Z',
	chassisPath: 'M-2 -12L56 -12L56 -8L-2 -8Z',
	rimPath: 'M0 -37L54 -37',
	plankPaths: ['M9 -35L9 -14', 'M45 -35L45 -14'],
	hitchPath: 'M54 -22L62 -22',
	hitchRingPath: 'M62 -26L62 -18',
	wheels: [
		{ x: 13, y: -7, radius: 7 },
		{ x: 41, y: -7, radius: 7 }
	] satisfies readonly Wheel[],
	/** The red lamp at the tail of the last wagon. */
	lamp: {
		bracketPath: 'M0 -30L-5 -30',
		housingPath:
			'M-14 -37Q-14 -39 -12 -39L-7 -39Q-5 -39 -5 -37L-5 -23Q-5 -21 -7 -21L-12 -21Q-14 -21 -14 -23Z',
		lens: { x: -9.5, y: -30, radius: 3.6 }
	}
} as const;

export const LOCO = {
	/** Front of the cowcatcher. */
	width: 108,
	/** Top of the chimney. */
	height: 72,
	cabPath: 'M0 -14L0 -64L34 -64L34 -14Z',
	roofPath: 'M-4 -64L38 -64L38 -69Q38 -72 35 -72L-1 -72Q-4 -72 -4 -69Z',
	windowPath: 'M7 -57Q7 -59 9 -59L25 -59Q27 -59 27 -57L27 -37Q27 -35 25 -35L9 -35Q7 -35 7 -37Z',
	boilerPath: 'M34 -18L34 -50L82 -50Q94 -50 94 -34Q94 -18 82 -18Z',
	bandPaths: ['M52 -50L52 -18', 'M68 -50L68 -18'],
	domePath: 'M42 -50Q42 -60 51 -60Q60 -60 60 -50Z',
	chimneyPath: 'M71 -50L73 -66L83 -66L85 -50Z',
	chimneyCapPath: 'M69 -66L87 -66L85 -72L71 -72Z',
	chassisPath: 'M-2 -14L98 -14L98 -8L-2 -8Z',
	cowcatcherPath: 'M96 -14L108 0L96 0Z',
	rodPath: 'M20 -12L78 -8',
	lamp: { x: 94, y: -36, radius: 4.5 },
	eyes: [
		{ x: 13.5, y: -47, radius: 4.2 },
		{ x: 22, y: -47, radius: 4.2 }
	] satisfies readonly Wheel[],
	pupils: [
		{ x: 15, y: -46, radius: 1.8 },
		{ x: 23.5, y: -46, radius: 1.8 }
	] satisfies readonly Wheel[],
	smilePath: 'M13 -41Q17.5 -37.5 22 -41',
	wheels: [
		{ x: 20, y: -12, radius: 12 },
		{ x: 56, y: -8, radius: 8 },
		{ x: 78, y: -8, radius: 8 }
	] satisfies readonly Wheel[],
	/** The chimney and the middle of its top, where the smoke starts. */
	chimney: { x: 78, top: -72 },
	/** A small cloud above the chimney while the train waits. */
	idlePuff: [
		{ x: 78, y: -85, radius: 6 },
		{ x: 86, y: -89, radius: 5.5 },
		{ x: 71, y: -90, radius: 5 },
		{ x: 79, y: -93, radius: 6 }
	] satisfies readonly Wheel[]
} as const;

export interface CargoItem {
	readonly d: string;
	readonly detail: string;
	readonly tone: number;
}

const POINTS_OF_STAR = 5;
const STAR_RATIO = 0.45;

function round(value: number): string {
	return String(Math.round(value * 10) / 10);
}

function circle(cx: number, cy: number, radius: number): string {
	return `M${round(cx - radius)} ${round(cy)}A${radius} ${radius} 0 1 0 ${round(cx + radius)} ${round(cy)}A${radius} ${radius} 0 1 0 ${round(cx - radius)} ${round(cy)}Z`;
}

function starPath(cx: number, cy: number, radius: number): string {
	const corners: string[] = [];
	for (let corner = 0; corner < POINTS_OF_STAR * 2; corner++) {
		const reach = corner % 2 === 0 ? radius : radius * STAR_RATIO;
		const angle = (Math.PI * corner) / POINTS_OF_STAR - Math.PI / 2;
		corners.push(`${round(cx + reach * Math.cos(angle))} ${round(cy + reach * Math.sin(angle))}`);
	}
	return `M${corners.join('L')}Z`;
}

const TOP = WAGON.bodyTop;

function crate(x: number, height: number, tone: number): CargoItem {
	return {
		d: `M${x} ${TOP}L${x} ${TOP - height}L${x + 10} ${TOP - height}L${x + 10} ${TOP}Z`,
		detail: `M${x + 1.5} ${TOP - 1.5}L${x + 8.5} ${TOP - height + 1.5}`,
		tone
	};
}

function ball(cx: number, tone: number): CargoItem {
	return {
		d: circle(cx, TOP - 6, 6),
		detail: `M${cx - 6} ${TOP - 6}L${cx + 6} ${TOP - 6}`,
		tone
	};
}

function barrel(x: number, tone: number): CargoItem {
	return {
		d: `M${x} ${TOP}Q${x - 2} ${TOP - 8} ${x} ${TOP - 16}L${x + 10} ${TOP - 16}Q${x + 12} ${TOP - 8} ${x + 10} ${TOP}Z`,
		detail: `M${x + 0.4} ${TOP - 5}L${x + 9.6} ${TOP - 5}M${x + 0.4} ${TOP - 11}L${x + 9.6} ${TOP - 11}`,
		tone
	};
}

function gift(x: number, tone: number): CargoItem {
	return {
		d: `M${x} ${TOP}L${x} ${TOP - 11}L${x + 10} ${TOP - 11}L${x + 10} ${TOP}Z`,
		detail: `M${x + 5} ${TOP}L${x + 5} ${TOP - 11}M${x} ${TOP - 5.5}L${x + 10} ${TOP - 5.5}`,
		tone
	};
}

function apple(cx: number, tone: number): CargoItem {
	return {
		d: circle(cx, TOP - 5.5, 5.5),
		detail: `M${cx} ${TOP - 11}Q${cx + 1} ${TOP - 15} ${cx + 5} ${TOP - 15}`,
		tone
	};
}

function star(cx: number, tone: number): CargoItem {
	return {
		d: starPath(cx, TOP - 7, 8),
		detail: '',
		tone
	};
}

const CARGO_X = [10, 21, 32, 43] as const;

/** Four items each, so that the wave of a load can pass from one to the next. */
export const CARGOS: readonly (readonly CargoItem[])[] = [
	[crate(5, 12, 0), crate(17, 16, 1), crate(29, 12, 3), crate(41, 16, 0)],
	CARGO_X.map((x, index) => ball(x, index % CARGO_TONES)),
	[gift(5, 1), gift(17, 0), gift(29, 3), gift(41, 1)],
	[barrel(5, 3), barrel(17, 1), barrel(29, 0), barrel(41, 3)],
	CARGO_X.map((x, index) => apple(x, (index + 2) % CARGO_TONES)),
	CARGO_X.map((x, index) => star(x, index % 2 === 0 ? 3 : 1))
];

/** Colour and load of the wagon of group `index`: fixed, never at random. */
export function wagonLook(index: number): { tone: number; cargo: number } {
	return {
		tone: index % WAGON_TONES,
		cargo: (index + Math.floor(index / WAGON_TONES)) % CARGO_KINDS
	};
}

/** The window of the wagon where the baby dinosaur shows up. */
export const DINO = {
	window: { x: 12, y: -43, width: 30, height: 24 },
	head: { x: 25, y: -30, radius: 9.5 },
	eyes: [
		{ x: 21.5, y: -32, radius: 1.9 },
		{ x: 28.5, y: -32, radius: 1.9 }
	] satisfies readonly Wheel[],
	smilePath: 'M21.5 -26Q25 -22.5 28.5 -26',
	platePaths: ['M18 -37L20 -42L23 -38.5', 'M23 -38.5L26 -43L29 -38.5', 'M29 -38.5L32 -42L33.5 -37'],
	armPath: 'M32 -22Q38 -24 38 -32',
	hand: { x: 38, y: -34, radius: 3.6 }
} as const;

/** The little rocket on the roof, drawn standing on (0, 0). */
export const ROOF_ROCKET = {
	bodyPath: 'M0 -38Q9 -28 9 -12L9 0L-9 0L-9 -12Q-9 -28 0 -38Z',
	window: { x: 0, y: -21, radius: 3.6 },
	finPaths: ['M-9 -10L-15 2L-9 0Z', 'M9 -10L15 2L9 0Z'],
	flameOuterPath: 'M-5 0Q0 18 5 0Z',
	flameInnerPath: 'M-2.5 0Q0 10 2.5 0Z',
	/** Where it stands: on the load of the wagon. */
	seat: { x: 27, y: -62 },
	puffs: [
		{ x: -8, y: -2, radius: 5 },
		{ x: 0, y: -4, radius: 6 },
		{ x: 8, y: -2, radius: 5 }
	] satisfies readonly Wheel[]
} as const;

/** A cloud in the shape of an exclamation mark, standing on (0, 0). */
export const EXCLAMATION = {
	barPath:
		'M-4.5 -12Q-10 -18 -8 -24Q-12 -30 -7 -35Q-6 -45 0 -45Q6 -45 7 -35Q12 -30 8 -24Q10 -18 4.5 -12Q0 -8 -4.5 -12Z',
	dot: { x: 0, y: -1, radius: 5.5 },
	wisps: [
		{ x: -14, y: -26, radius: 3.5 },
		{ x: 15, y: -34, radius: 3 },
		{ x: 13, y: -16, radius: 2.5 }
	] satisfies readonly Wheel[]
} as const;

/** The little hill with the mouth of the tunnel, standing at the left of a wagon. */
export const TUNNEL = {
	/** Where the hill starts, to the left of the slot of the wagon. */
	hillPath: 'M-84 0L-84 -22Q-80 -62 -40 -72Q-14 -76 -8 -52L-8 0Z',
	stonePaths: ['M-66 -28L-58 -34', 'M-44 -50L-36 -44', 'M-26 -26L-18 -32', 'M-72 -48L-66 -52'],
	mouthPath: 'M-12 0L-12 -34Q-12 -56 -2 -56Q8 -56 8 -34L8 0Z'
} as const;

/** Small clouds of dust behind the wheels of a wagon that brakes. */
export const BRAKE_DUST: readonly Wheel[] = [
	{ x: 6, y: -3, radius: 3 },
	{ x: 0, y: -6, radius: 4 },
	{ x: -7, y: -3, radius: 2.5 }
];

/** Strokes that flash where two wagons meet, around (58, -22). */
export const HOOK_SPARKS: readonly string[] = [
	'M58 -34L58 -42',
	'M65 -30L70 -36',
	'M51 -30L46 -36'
];

/** Clouds of the departure, from the first to the last. */
export const SMOKE_PUFFS: readonly (readonly Wheel[])[] = [
	[
		{ x: 0, y: 0, radius: 9 },
		{ x: 9, y: -5, radius: 7 },
		{ x: -8, y: -5, radius: 6 },
		{ x: 1, y: -9, radius: 7 }
	],
	[
		{ x: 0, y: 0, radius: 11 },
		{ x: 11, y: -6, radius: 8 },
		{ x: -10, y: -6, radius: 7 },
		{ x: 1, y: -11, radius: 8 }
	],
	[
		{ x: 0, y: 0, radius: 13 },
		{ x: 13, y: -7, radius: 9 },
		{ x: -12, y: -7, radius: 8 },
		{ x: 1, y: -13, radius: 9 }
	],
	[
		{ x: 0, y: 0, radius: 14 },
		{ x: 14, y: -8, radius: 10 },
		{ x: -13, y: -8, radius: 9 },
		{ x: 1, y: -14, radius: 10 }
	]
];

/** The landscape behind the rails, in scene units. */
export const LANDSCAPE = {
	farHillPath:
		'M0 204L0 150Q70 100 150 140Q210 168 280 130Q360 92 430 140Q480 168 520 148L520 204Z',
	nearHillPath: 'M0 204L0 178Q90 150 200 180Q300 205 400 172Q470 150 520 175L520 204Z',
	sun: { x: 488, y: 38, radius: 12 },
	clouds: [
		[
			{ x: 150, y: 96, radius: 11 },
			{ x: 164, y: 90, radius: 13 },
			{ x: 180, y: 97, radius: 10 }
		],
		[
			{ x: 316, y: 90, radius: 9 },
			{ x: 329, y: 85, radius: 11 },
			{ x: 342, y: 91, radius: 8 }
		]
	] satisfies readonly (readonly Wheel[])[],
	station: {
		bodyPath: 'M14 204L14 170L64 170L64 204Z',
		roofPath: 'M8 170L39 148L70 170Z',
		doorPath: 'M32 204L32 184L46 184L46 204Z',
		windowPaths: ['M19 177L19 187L28 187L28 177Z', 'M50 177L50 187L59 187L59 177Z']
	}
} as const;

/** The rails, in scene units. */
export const TRACK = {
	y: 204,
	railHeight: 5,
	tieY: 209,
	tieWidth: 14,
	tieHeight: 6,
	tieSpacing: 26,
	groundHeight: 31
} as const;
