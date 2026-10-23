/**
 * Drawing data of the egg and the baby dinos, in a 120 x 150 box, lit from the top left.
 * Every path is written with absolute M, L, C, Q and Z commands in "x y" pairs, so that it can
 * be moved, turned or mirrored by `mapPath`.
 */
import { capsulePath, ovalPath, roundedStarPath, type XY } from '$lib/ui/companion/geometry';

export type Side = 'left' | 'right';

export const SIDES: readonly Side[] = ['left', 'right'];

/** The middle of the view box: the right side of a baby is its left side mirrored. */
const MIDDLE = 60;

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

export function mirror(d: string): string {
	return mapPath(d, (x, y) => [2 * MIDDLE - x, y]);
}

function both(d: string): Readonly<Record<Side, string>> {
	return { left: d, right: mirror(d) };
}

function shift(d: string, dx: number, dy: number): string {
	return mapPath(d, (x, y) => [x + dx, y + dy]);
}

/**
 * The shade of a form: the form and a copy moved toward the light, filled even-odd. Kept inside
 * the form by a clip, only the side away from the light stays. Small moves keep the bounding box
 * of an animated group almost the same (its transforms are given in percent of it).
 */
export function shadeOf(d: string, toward: number, down = toward): string {
	return d + shift(d, -toward, -down);
}

/* ------------------------------------------------------------------ The egg */

export const EGG_PATH =
	'M60 6C88 6 110 52 110 92C110 126 88 146 60 146C32 146 10 126 10 92C10 52 32 6 60 6Z';

export const EGG_SHADE = shadeOf(EGG_PATH, 9, 7);

/** A long gleam along the lit side, and a small one near the top. */
export const EGG_LIGHTS = [
	'M22.4 66C21.6 50 26.4 34 36.4 22.4C38 20.6 40.4 22.4 39.2 24.4C32.6 35 29 49 28.6 64.6C28.4 68.6 22.6 69.6 22.4 66Z',
	ovalPath(46.4, 15.4, 2.4, 1.8),
	ovalPath(26.4, 76.4, 1.6, 2.4)
] as const;

/** Light bounced back from the ground on the bottom of the egg. */
export const EGG_LOW_LIGHT =
	'M17.6 110C19.6 122 27 132 37.6 138.4C38.8 139.2 38 140.8 36.6 140.2C25.2 135 17.2 124 15.4 111.2C15.2 109.4 17.4 108.6 17.6 110Z';

export const EGG_GROUND = ovalPath(60, 146, 40, 4.6);

/** A rounded blob: six points around (cx, cy), joined by smooth curves. */
function blob(cx: number, cy: number, rx: number, ry: number, turn: number): string {
	const wobble = [1, 0.8, 1.08, 0.88, 1.12, 0.84];
	const points: XY[] = wobble.map((w, i) => {
		const angle = ((i * 60 + turn) * Math.PI) / 180;
		return [cx + rx * w * Math.cos(angle), cy + ry * w * Math.sin(angle)];
	});
	const mid = (a: XY, b: XY): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
	const last = points[points.length - 1] ?? points[0] ?? [cx, cy];
	const first = points[0] ?? [cx, cy];
	const start = mid(last, first);
	const curves = points.map((p, i) => {
		const next = points[(i + 1) % points.length] ?? p;
		return `Q${pt(...p)} ${pt(...mid(p, next))}`;
	});
	return `M${pt(...start)}${curves.join('')}Z`;
}

/** Spots of the top of the egg (cap) and of its bottom, never across the line where it splits. */
export const SPOTS_TOP = [
	blob(36, 56, 8.4, 6.6, 10),
	blob(80, 38, 5.2, 4.4, 40),
	blob(66, 70, 4, 3.4, 0),
	blob(101, 64, 4.4, 6.4, 20),
	blob(52, 30, 3, 2.6, 30)
] as const;

export const SPOTS_BOTTOM = [
	blob(84, 114, 10, 8, 15),
	blob(46, 126, 5.8, 4.6, 50),
	blob(20, 108, 5.4, 6.6, 0),
	blob(64, 106, 3.2, 2.8, 25)
] as const;

/* --------------------------------------------------- Where the shell splits */

interface Segment {
	from: XY;
	control: XY;
	to: XY;
}

/** Teeth of the broken edge: x, then how far up (negative) or down the tooth goes. */
const TEETH: readonly XY[] = [
	[10, 0],
	[15, -3],
	[22, 2.5],
	[28, -4.5],
	[36, 3.5],
	[41, -1.5],
	[47, 4.5],
	[54, -5],
	[61, 2.5],
	[66, -2],
	[72, 4.5],
	[80, -5],
	[86, 1.5],
	[92, -3.5],
	[99, 3.5],
	[105, -2.5],
	[110, 0]
];

/** A ring around the egg, seen a little from above: its front bows down, its back bows up. */
function ringY(x: number, bow: number): number {
	const u = (x - MIDDLE) / 50;
	return 88 + bow * (1 - u * u);
}

/** How thick the shell looks at x: nothing at the sides, where the edge is seen from the side. */
function thicknessAt(x: number, most: number): number {
	const u = (x - MIDDLE) / 50;
	return most * Math.sqrt(Math.max(0, 1 - u * u));
}

function brokenEdge(bow: number, depth: number): XY[] {
	return TEETH.map(([x, tooth]) => [x, ringY(x, bow) + tooth * depth]);
}

/** Each chip of the edge bulges a little, one way then the other: broken shell, not a saw. */
function segmentsOf(points: readonly XY[], bulge: number): Segment[] {
	return points.slice(1).map((to, i) => {
		const from = points[i] ?? to;
		const dx = to[0] - from[0];
		const dy = to[1] - from[1];
		const length = Math.hypot(dx, dy) || 1;
		const sign = i % 2 === 0 ? 1 : -1;
		const control: XY = [
			(from[0] + to[0]) / 2 + (-dy / length) * bulge * sign,
			(from[1] + to[1]) / 2 + (dx / length) * bulge * sign
		];
		return { from, control, to };
	});
}

function forward(segments: readonly Segment[]): string {
	return segments.map((s) => `Q${pt(...s.control)} ${pt(...s.to)}`).join('');
}

function backward(segments: readonly Segment[]): string {
	return [...segments]
		.reverse()
		.map((s) => `Q${pt(...s.control)} ${pt(...s.from)}`)
		.join('');
}

function thicker(segments: readonly Segment[], most: number): Segment[] {
	const down = ([x, y]: XY): XY => [x, y + thicknessAt(x, most)];
	return segments.map((s) => ({ from: down(s.from), control: down(s.control), to: down(s.to) }));
}

const FRONT_POINTS = brokenEdge(6, 1);
const FRONT_EDGE = segmentsOf(FRONT_POINTS, 1.4);
const BACK_EDGE = segmentsOf(brokenEdge(-7, 0.55), 1);
const LOWER = 'C110 126 88 146 60 146C32 146 10 126 10 88Z';

/** The bottom of the shell, seen from the front, up to its broken edge. */
export const SHELL_BOTTOM_PATH = `M10 88${forward(FRONT_EDGE)}L110 88${LOWER}`;

/** The top of the broken edge: the thickness of the shell, seen from a little above. */
export const SHELL_BOTTOM_RIM = `M10 88${forward(FRONT_EDGE)}${backward(thicker(FRONT_EDGE, 3))}Z`;

export const SHELL_BOTTOM_RIM_LINE = `M${pt(...(thicker(FRONT_EDGE, 3)[0]?.from ?? [10, 88]))}${forward(thicker(FRONT_EDGE, 3))}`;

/** The inside of the back of the shell, over the front edge, with the top of its own edge. */
export const SHELL_INSIDE_PATH = `M10 88${forward(BACK_EDGE)}L110 88${backward(FRONT_EDGE)}Z`;

export const SHELL_INSIDE_SHADE = shadeOf(SHELL_INSIDE_PATH, -10, -3);

export const SHELL_INSIDE_RIM = `M10 88${forward(BACK_EDGE)}${backward(thicker(BACK_EDGE, 2.4))}Z`;

/**
 * Both halves of the bottom (the inside behind the baby, the front before it) are drawn in this
 * same invisible box, shades included: their animations, given in percent of it, then match.
 */
export const SHELL_BOTTOM_BOX = { x: 0, y: 74, width: 120, height: 72 } as const;

export const SHELL_TOP_PATH = `M10 88C10 50 32 6 60 6C88 6 110 50 110 88${backward(FRONT_EDGE)}Z`;

export const SHELL_TOP_RIM = `M10 88${forward(FRONT_EDGE)}${backward(thicker(FRONT_EDGE, -3))}Z`;

export const SHELL_BOTTOM_SHADE = shadeOf(SHELL_BOTTOM_PATH, 9, 7);

export const SHELL_TOP_SHADE = shadeOf(SHELL_TOP_PATH, 9, 7);

/* ------------------------------------------------------------------ Cracks */

/** A crack: a dark groove thick in its middle and sharp at both ends. */
function groove(points: readonly XY[], width: number): string {
	const count = points.length;
	const lengths = points.map((p, i) => {
		const before = points[i - 1];
		return before ? Math.hypot(p[0] - before[0], p[1] - before[1]) : 0;
	});
	const total = lengths.reduce((sum, l) => sum + l, 0) || 1;
	let walked = 0;
	const upper: XY[] = [];
	const lower: XY[] = [];
	points.forEach((p, i) => {
		walked += lengths[i] ?? 0;
		const before = points[Math.max(0, i - 1)] ?? p;
		const after = points[Math.min(count - 1, i + 1)] ?? p;
		const dx = after[0] - before[0];
		const dy = after[1] - before[1];
		const length = Math.hypot(dx, dy) || 1;
		const half = width * Math.sin((Math.PI * walked) / total);
		upper.push([p[0] + (-dy / length) * half, p[1] + (dx / length) * half]);
		lower.push([p[0] - (-dy / length) * half, p[1] - (dx / length) * half]);
	});
	return `M${upper.map((p) => pt(...p)).join('L')}L${lower
		.reverse()
		.map((p) => pt(...p))
		.join('L')}Z`;
}

/** The light caught by the lower lip of a crack. */
function lip(points: readonly XY[], below: number): string {
	const inner = points.slice(1, -1);
	return inner.length < 2 ? '' : `M${inner.map(([x, y]) => pt(x, y + below)).join('L')}`;
}

/** The points of the front edge between two x, cut where the range ends. */
function edgeBetween(from: number, to: number): XY[] {
	const at = (x: number): XY => {
		const i = FRONT_POINTS.findIndex((p) => p[0] >= x);
		const b = FRONT_POINTS[Math.max(1, i)] ?? [x, 88];
		const a = FRONT_POINTS[Math.max(0, i - 1)] ?? b;
		const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
		return [x, a[1] + (b[1] - a[1]) * t];
	};
	return [at(from), ...FRONT_POINTS.filter((p) => p[0] > from && p[0] < to), at(to)];
}

/** Forks of the crack: the tooth they leave from, then their turns, from that tooth. */
const FORKS: readonly { tooth: number; turns: readonly XY[] }[] = [
	{
		tooth: 7,
		turns: [
			[-4, -6.4],
			[-2.6, -11.6],
			[-6.4, -17]
		]
	},
	{
		tooth: 10,
		turns: [
			[4.2, 5.8],
			[2.6, 11],
			[6.4, 16]
		]
	},
	{
		tooth: 3,
		turns: [
			[-2.6, -6.6],
			[0.4, -12.2]
		]
	},
	{
		tooth: 14,
		turns: [
			[4.2, 5.4],
			[3, 9.8]
		]
	}
];

const BRANCHES: readonly (readonly XY[])[] = FORKS.map(({ tooth, turns }) => {
	const [x, y] = FRONT_POINTS[tooth] ?? [MIDDLE, 88];
	return [[x, y], ...turns.map(([dx, dy]): XY => [x + dx, y + dy])];
});

/** How far the crack runs along the edge, and how many branches it has, at each stage. */
const CRACK_STAGES = [
	{ from: 45, to: 73, branches: 0 },
	{ from: 31, to: 88, branches: 1 },
	{ from: 17, to: 102, branches: 2 },
	{ from: 10, to: 110, branches: 4 }
] as const;

/**
 * One crack per stage, each the whole crack at that stage: they lie on the line where the egg
 * will split, follow the curve of the egg, and grow from its front toward both sides.
 */
export const CRACKS = CRACK_STAGES.map(({ from, to, branches }) => {
	const main = edgeBetween(from, to);
	const forks = BRANCHES.slice(0, branches);
	return {
		groove: groove(main, 2) + forks.map((f) => groove(f, 1.3)).join(''),
		lip: lip(main, 2.6)
	};
});

export const CRACK_COUNT = CRACKS.length;

/** Pieces of shell that fly away when an egg bursts, around the middle of the egg. */
export const SHARDS = [
	{
		angle: -150,
		path: 'M53.6 70.4Q58.6 66.2 66 68.4L64.6 73.6Q60.4 72.6 56.8 75.8Z',
		rim: 'M64.6 73.6Q60.4 72.6 56.8 75.8L56 74.4Q60 71.2 64.8 72.2Z'
	},
	{
		angle: -30,
		path: 'M57 66.4Q63.4 65.8 68 70.6L62.6 78.4Q61.4 74 56.4 72.4Z',
		rim: 'M62.6 78.4Q61.4 74 56.4 72.4L56.6 70.8Q62.6 72.6 64 77.2Z'
	},
	{
		angle: 40,
		path: 'M55.6 83.6Q60.4 79 66.4 80.2L64.8 91.6Q61.4 87.4 57 88.6Z',
		rim: 'M64.8 91.6Q61.4 87.4 57 88.6L56.6 87Q61.8 85.6 65.2 89.6Z'
	},
	{
		angle: 140,
		path: 'M51.4 76.4Q57 79.6 60.4 85.6L50.4 88.4Q52.6 82.6 51.4 76.4Z',
		rim: 'M50.4 88.4Q52.6 82.6 51.4 76.4L53 77.4Q54.2 82.8 52.4 87.8Z'
	}
] as const;

/* ---------------------------------------------------------------- The baby */

/** The head is drawn in its own coordinates, those of the companion's head, then moved down. */
export const HEAD_OFFSET = 6;

export const HEAD =
	'M60 18C76 18 88 28 89.6 42C90.6 50 91.4 57 88.6 63.4C85 71.6 74.6 76.6 60 76.6C45.4 76.6 35 71.6 31.4 63.4C28.6 57 29.4 50 30.4 42C32 28 44 18 60 18Z';

export const HEAD_SHADE = shadeOf(HEAD, 4.5);

export const HEAD_LIGHTS = [
	'M37.4 35C38.8 28.4 44 23.6 50.4 22.4C46.4 25.8 43 30.2 41 35.8C40.2 37.8 37 37.2 37.4 35Z',
	'M53 56C55.6 55 64.4 55 67 56C64.4 57 55.6 57 53 56Z'
] as const;

export const SNOUT_RIDGE = 'M46.6 61C49.6 56.8 54.4 54.6 60 54.6C65.6 54.6 70.4 56.8 73.4 61';

export const NOSTRILS = both(
	'M56 57.4C55.2 57.7 54.6 58.6 55 59.3C55.4 59.9 56.7 59.5 57.1 58.6C57.3 57.9 56.7 57.2 56 57.4Z'
);

export const CHEEKS = both(ovalPath(38.8, 62.6, 4.2, 2.8));

/** A brow thick in its middle and thin at both ends. */
function browPath(from: XY, to: XY, bend: number): string {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const length = Math.hypot(dx, dy) || 1;
	const nx = -dy / length;
	const ny = dx / length;
	const mx = (from[0] + to[0]) / 2 + nx * bend;
	const my = (from[1] + to[1]) / 2 + ny * bend;
	return `M${pt(...from)}Q${pt(mx + nx * 2.6, my + ny * 2.6)} ${pt(...to)}Q${pt(mx - nx * 2.6, my - ny * 2.6)} ${pt(...from)}Z`;
}

export const BROWS = both(browPath([40.6, 32.8], [53.2, 31.6], -2.4));

export interface Eye {
	white: string;
	iris: string;
	pupil: string;
	glints: readonly string[];
	/** The shade of the brow on the top of the eye. */
	lid: string;
}

function eyeAt(cx: number, cy: number): Eye {
	const lx = cx + 0.4;
	const ly = cy - 0.4;
	return {
		white: ovalPath(cx, cy, 8.2, 9.6),
		iris: ovalPath(lx, ly, 5.6, 6.4),
		pupil: ovalPath(lx, ly + 0.2, 3.2, 3.8),
		glints: [ovalPath(lx + 1.9, ly - 2.5, 2, 2), ovalPath(lx - 1.8, ly + 2.6, 0.9, 0.9)],
		lid: `M${pt(cx - 10, cy - 11)}L${pt(cx + 10, cy - 11)}L${pt(cx + 10, cy - 5.4)}Q${pt(cx, cy - 8.6)} ${pt(cx - 10, cy - 5.4)}Z`
	};
}

export const EYES: Readonly<Record<Side, Eye>> = {
	left: eyeAt(47.4, 45.4),
	right: eyeAt(72.6, 45.4)
};

export const MOUTH =
	'M51.6 65C55.4 66.8 64.6 66.8 68.4 65C68 70.4 64.4 73 60 73C55.6 73 52 70.4 51.6 65Z';

export const TONGUE = 'M54.6 74.4C54.6 70.6 57.2 69.2 60 69.2C62.8 69.2 65.4 70.6 65.4 74.4Z';

/** The mouth wide open, for a yawn or a fright. */
export const YAWN_MOUTH = ovalPath(60, 68.2, 6.8, 7.2);

export const YAWN_TONGUE = 'M53 76C53 71.6 56 70.2 60 70.2C64 70.2 67 71.6 67 76Z';

/** A dorsal plate standing on (0, 0), its rounded tip `h` above. */
export function platePath(h: number, w: number): string {
	return `M${pt(-w, 1)}C${pt(-w, -h * 0.5)} ${pt(-w * 0.62, -h * 0.94)} ${pt(0, -h)}C${pt(w * 0.62, -h * 0.94)} ${pt(w, -h * 0.5)} ${pt(w, 1)}Z`;
}

/** From the sides to the middle, so that the biggest one is in front. */
export const HEAD_PLATES = [
	{ x: 46.6, y: 24.6, angle: -32, h: 9.6, w: 4.4 },
	{ x: 73.4, y: 24.6, angle: 32, h: 9.6, w: 4.4 },
	{ x: 60, y: 20, angle: 0, h: 13.6, w: 5.8 }
].map((p) => {
	const d = platePath(p.h, p.w);
	return {
		transform: `translate(${p.x} ${p.y}) rotate(${p.angle})`,
		d,
		shade: shadeOf(d, p.w * 0.35),
		vein: `M0 ${round(-p.h * 0.2)}Q${round(p.w * 0.12)} ${round(-p.h * 0.5)} 0 ${round(-p.h * 0.78)}`
	};
});

export const BODY =
	'M60 66C74.4 66 84 74.6 87 88C90 101.6 90.4 115 84.6 121.6C79 127.6 70.4 128 60 128C49.6 128 41 127.6 35.4 121.6C29.6 115 30 101.6 33 88C36 74.6 45.6 66 60 66Z';

export const BODY_SHADE = shadeOf(BODY, 4.5);

export const BODY_LIGHT =
	'M35.6 96C36.4 89.6 38.6 84.6 41.4 81.2C40.6 86 40.2 91.4 40.4 97C40.4 99.4 35.4 99.2 35.6 96Z';

export const BELLY =
	'M60 79C69.6 79 76 87 77 98.6C78 110.4 71.4 120 60 120C48.6 120 42 110.4 43 98.6C44 87 50.4 79 60 79Z';

export const BELLY_SHADE = shadeOf(BELLY, 2.4);

export const BELLY_BANDS =
	'M40 88Q60 93.6 80 88M40 95.4Q60 101 80 95.4M40 102.8Q60 108 80 102.8M40 110.2Q60 115 80 110.2';

/** The shade of the chin on the chest. */
export const CHIN_SHADE = 'M40 78C46 87 74 87 80 78C76 91 44 91 40 78Z';

/** The hand around its grip (0, 0), three fingers along +y, its outer side along +x. */
const HAND_LINE_LOCAL =
	'M3.8 -5.5C5.6 -3.6 6.2 -0.8 5.8 1.8C6.4 3.4 6 5.6 4.6 6.4C3.4 7.1 2.2 6.6 1.9 5.6C1.4 7.4 -1.4 7.6 -2 5.8C-2.6 7 -4.6 6.8 -5.2 5.2C-5.8 3.6 -6 1 -5.6 -1C-5.2 -3 -4.6 -4.4 -3.8 -5.5';
const FINGERS_LOCAL = 'M1.9 5.6C1.7 4.4 1.6 3.4 1.8 2.6M-2 5.8C-2.3 4.6 -2.5 3.6 -2.4 2.8';
/** The fingers curled around what the hand holds. */
const FIST_LOCAL =
	'M-5.6 -2C-2.6 -3.4 2.6 -3.4 5.8 -2C6.6 0.4 5.8 2.6 4.6 3C1.6 2 -1.6 2 -4.8 3C-6 2.4 -6.4 -0.2 -5.6 -2Z';
const KNUCKLES_LOCAL = 'M-1.6 -2.8C-1.4 -0.8 -1.4 0.8 -1.6 2.2M1.8 -2.8C2 -0.8 2 0.8 1.8 2.2';

/** Places a drawing made around (0, 0) at `grip`: +y toward `toward`, scaled by `size`. */
function placer(grip: XY, toward: XY, size: number): (d: string) => string {
	const length = Math.hypot(toward[0], toward[1]) || 1;
	const d: XY = [toward[0] / length, toward[1] / length];
	const n: XY = [d[1], -d[0]];
	return (path) =>
		mapPath(path, (x, y) => [
			grip[0] + size * (x * n[0] + y * d[0]),
			grip[1] + size * (x * n[1] + y * d[1])
		]);
}

export interface Hand {
	fill: string;
	shade: string;
	line: string;
	fingers: string;
}

function handAt(grip: XY, toward: XY, size: number): Hand {
	const place = placer(grip, toward, size);
	const fill = `${place(HAND_LINE_LOCAL)}Z`;
	return {
		fill,
		shade: shadeOf(fill, 1.2),
		line: place(HAND_LINE_LOCAL),
		fingers: place(FINGERS_LOCAL)
	};
}

function mirrorHand(hand: Hand): Hand {
	return {
		fill: mirror(hand.fill),
		shade: shadeOf(mirror(hand.fill), 1.2),
		line: mirror(hand.line),
		fingers: mirror(hand.fingers)
	};
}

export interface Arm {
	fill: string;
	shade: string;
	hand: Hand;
}

function armPair(fill: string, hand: Hand): Readonly<Record<Side, Arm>> {
	return {
		left: { fill, shade: shadeOf(fill, 1.8), hand },
		right: { fill: mirror(fill), shade: shadeOf(mirror(fill), 1.8), hand: mirrorHand(hand) }
	};
}

/** Short arms held out from the shoulders, hands open: "here I am!". */
export const REST_ARMS = armPair(
	'M45 80C40 81 34.6 79.6 30.8 75.6L26.2 79.4C30.6 85.4 37.6 89.6 46 90Z',
	handAt([26.5, 74.8], [-0.6, -0.8], 0.92)
);

/** Arms raised above the head, elbows out. */
export const RAISED_ARMS = armPair(
	'M36 90C22 86 12 70 16.4 52C18 45 20.4 38 22.6 32.6L28.4 34.6C26.6 40 24.6 46 23.6 53C22 66 30 76 44 79Z',
	handAt([26.1, 30.3], [0.17, -0.98], 0.92)
);

/** Feet that show under the bit of shell a baby walks in, like pants. */
const FOOT_LOCAL =
	'M32.6 106.5C32 101.5 37 100 44 100C51 100 56 101.5 55.4 106.5C55.8 110.4 54.4 113 51.6 113.2C50.2 113.4 48.6 113 47.8 112.2C46.6 113.6 42.2 113.8 40.6 112.4C39.6 113.2 38 113.4 36.8 113.2C33.8 112.8 32.2 110.2 32.6 106.5Z';
const TOES_LOCAL =
	'M47.8 112.2C47.9 111 47.7 110 47.2 109M40.6 112.4C40.4 111.2 40.6 110.2 41 109.2';
const CLAWS_LOCAL = [36.6, 44.2, 51.6]
	.map((x, i) => {
		const y = i === 1 ? 112.8 : 112.4;
		return `M${pt(x - 1.6, y)}C${pt(x - 1.6, y - 1.4)} ${pt(x - 0.8, y - 2)} ${pt(x, y - 2)}C${pt(x + 0.8, y - 2)} ${pt(x + 1.6, y - 1.4)} ${pt(x + 1.6, y)}C${pt(x + 0.6, y + 0.6)} ${pt(x - 0.6, y + 0.6)} ${pt(x - 1.6, y)}Z`;
	})
	.join('');

const toFoot = (d: string) =>
	mapPath(d, (x, y) => [46 + (x - 44) * 0.86, 148 + (y - 106.6) * 0.86]);

export const FEET = SIDES.map((side) => {
	const pick = (d: string) => (side === 'left' ? toFoot(d) : mirror(toFoot(d)));
	return {
		side,
		fill: pick(FOOT_LOCAL),
		shade: shadeOf(pick(FOOT_LOCAL), 1.8),
		toes: pick(TOES_LOCAL),
		claws: pick(CLAWS_LOCAL)
	};
});

/* ------------------------------------------------------------- Scene props */

/** The bit of shell a baby keeps on its head, like a hat, in the coordinates of its head. */
const HAT_EDGE = segmentsOf(
	[
		[40.4, 19],
		[45, 14.4],
		[50, 20],
		[55.4, 13.6],
		[61, 19.4],
		[66.4, 13.4],
		[71.6, 19.2],
		[76, 14.6],
		[80.4, 18.4]
	],
	0.9
);

export const HAT_PATH = `M40.4 19C40 6 50 -2.6 60.4 -2.6C70.8 -2.6 80.6 5.6 80.4 18.4${backward(HAT_EDGE)}Z`;

export const HAT_RIM = `M40.4 19${forward(HAT_EDGE)}${backward(thicker(HAT_EDGE, -2.4))}Z`;

export const HAT_SHADE = shadeOf(HAT_PATH, 3);

export const HAT_SPOT = blob(52, 5, 3.4, 2.6, 20);

/** Little stars that turn around the head of a baby that fell out of its egg. */
export const DIZZY_STARS = [
	roundedStarPath(60, 21, 5.6, 2.6, 5, 0.22),
	roundedStarPath(36, 29, 4.6, 2.1, 5, 0.22),
	roundedStarPath(84, 29, 4.6, 2.1, 5, 0.22)
] as const;

/** The two small babies that come out of one egg: the usual baby, shrunk and moved aside. */
export const TWINS = [
	{ side: 'left', transform: 'translate(-1.6 16.8) scale(0.66)' },
	{ side: 'right', transform: 'translate(42.4 16.8) scale(0.66)' }
] as const;

/** The wooden spoon a baby rows with, held in its fist at the place of its right hand. */
const SPOON_GRIP: XY = [93.5, 74.8];
export const SPOON_HANDLE = capsulePath(95.6, 76, 113.2, 117.6, 2);
const SPOON_BOWL_CENTER: XY = [117.4, 125.6];
const turnSpoon = (d: string) =>
	mapPath(d, (x, y) => {
		const angle = (-24 * Math.PI) / 180;
		const dx = x - SPOON_BOWL_CENTER[0];
		const dy = y - SPOON_BOWL_CENTER[1];
		return [
			SPOON_BOWL_CENTER[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
			SPOON_BOWL_CENTER[1] + dx * Math.sin(angle) + dy * Math.cos(angle)
		];
	});
export const SPOON_BOWL = turnSpoon(ovalPath(117.4, 125.6, 6.2, 8.8));
export const SPOON_HOLLOW = turnSpoon(ovalPath(117.8, 126.4, 4, 6.2));
export const SPOON_GLINT = turnSpoon(ovalPath(115.4, 121.6, 1.2, 2.2));
const placeFist = placer(SPOON_GRIP, [-0.66, 0.75], 0.92);
export const SPOON_FIST = placeFist(FIST_LOCAL);
export const SPOON_KNUCKLES = placeFist(KNUCKLES_LOCAL);

/** Water in front of a shell that floats like a boat. */
export const WATER =
	'M-6 136Q4 130 14 136Q24 142 34 136Q44 130 54 136Q64 142 74 136Q84 130 94 136Q104 142 114 136Q124 130 134 136L134 156L-6 156Z';

export const WAVES = [
	'M-6 136Q4 130 14 136Q24 142 34 136Q44 130 54 136Q64 142 74 136Q84 130 94 136Q104 142 114 136Q124 130 134 136',
	'M2 147Q10 143 18 147M42 148Q50 144 58 148M82 147Q90 143 98 147'
] as const;

/** Chef's hat of a baby that cooks, in the coordinates of its head. */
export const TOQUE_PUFF =
	'M40 22C34 20 32.6 12 37.6 8.4C38.6 2.6 45 -0.6 50.4 2C53.4 -2.4 66.6 -2.4 69.6 2C75 -0.6 81.4 2.6 82.4 8.4C87.4 12 86 20 80 22Z';

export const TOQUE_PUFF_SHADE = shadeOf(TOQUE_PUFF, 3);

export const TOQUE_BAND = 'M38.6 21C50 23.6 70 23.6 81.4 21L82.2 29.4C70 32.4 50 32.4 37.8 29.4Z';

export const TOQUE_BAND_SHADE = shadeOf(TOQUE_BAND, 2);

export const TOQUE_FOLDS =
	'M50.4 4.6C49 10 49.2 16 50.6 21.4M60 2.4C59.4 9 59.4 15.6 60 22.2M69.6 4.6C71 10 70.8 16 69.4 21.4';

/** The little cake, drawn where it ends up: served on the ground in front of the egg. */
export const DISH_PLATE = ovalPath(60, 141, 27, 6.4);

export const DISH_PLATE_INNER = ovalPath(60, 140, 19, 3.8);

export const DISH_CAKE =
	'M42 139C41.4 128 44 120.6 50 117.6C55 115.2 65 115.2 70 117.6C76 120.6 78.6 128 78 139C70 141.4 50 141.4 42 139Z';

export const DISH_CAKE_SHADE = shadeOf(DISH_CAKE, 3);

export const DISH_ICING =
	'M44.2 123C46 118.4 52 115.6 60 115.6C68 115.6 74 118.4 75.8 123C75.4 126 73.2 126.6 72 124.6C70.8 127.6 67.8 128 66.6 125.4C64.4 128.8 59 129 57.2 125.6C55.2 128.2 51.4 128.2 50.4 125C49 127.6 45.6 127.4 44.2 123Z';

export const DISH_CHERRY = ovalPath(60, 112.4, 4.2, 4);

export const DISH_CHERRY_GLINT = ovalPath(58.4, 110.8, 1.2, 1);

export const DISH_STEM = 'M60.4 108.6C61 105.4 62.6 103 65 101.6';

export const DISH_SPRINKLES = [
	{ d: capsulePath(49, 120.6, 51.4, 119.6, 0.8), kind: 'a' },
	{ d: capsulePath(67.6, 119.2, 70, 120.4, 0.8), kind: 'b' },
	{ d: capsulePath(55.4, 118.6, 57, 120.6, 0.8), kind: 'c' },
	{ d: capsulePath(63.4, 121.6, 65.8, 121, 0.8), kind: 'a' }
] as const;

export const STEAM_WISPS = [
	'M49 113C45.6 108.4 52.4 105.6 49 101',
	'M71 113C67.6 108.4 74.4 105.6 71 101'
] as const;

/** A flying saucer that hovers at the top of the picture, and the soft beam under it. */
export const SAUCER_DOME = 'M44 11C44 0.6 51 -4 60 -4C69 -4 76 0.6 76 11Z';

export const SAUCER_DOME_LIGHT =
	'M48 7.6C48 3.4 51 0.2 55 -0.8C52.4 1.6 51 4.6 51.2 7.8C51.2 9 48 9 48 7.6Z';

export const SAUCER_PILOT = ovalPath(63, 3.6, 5.2, 4.8);

export const SAUCER_PILOT_EYES = [
	ovalPath(61.2, 2.8, 1.2, 1.5),
	ovalPath(65.4, 2.8, 1.2, 1.5)
] as const;

export const SAUCER_BODY = ovalPath(60, 13, 33, 7.6);

export const SAUCER_BODY_SHADE = shadeOf(SAUCER_BODY, 0, 3.4);

export const SAUCER_BAND = 'M27.6 14.6C38 18.6 82 18.6 92.4 14.6';

export const SAUCER_SHINE = 'M36 10.4C46 7.8 74 7.8 84 10.4C74 9.2 46 9.2 36 10.4Z';

export const SAUCER_LIGHTS = [
	ovalPath(38, 15.4, 2, 1.6),
	ovalPath(49, 17, 2, 1.6),
	ovalPath(60, 17.6, 2, 1.6),
	ovalPath(71, 17, 2, 1.6),
	ovalPath(82, 15.4, 2, 1.6)
] as const;

export const BEAM_PATH = 'M46 19L74 19L108 148L12 148Z';

export const BEAM_RINGS = [ovalPath(60, 56, 22, 3.6), ovalPath(60, 96, 33, 5)] as const;

/** A small car that stops in front of the egg, drawn at its stopping place and facing right. */
export const CAR_BODY =
	'M31 137.6C30 131.6 32.4 126.8 38 125.6L46.6 124C49.6 117.4 53 112 58.6 111.4C64 110.8 70 111 73.4 111.6C76.6 112.2 79 116.6 81 123.6L84.4 124.4C88.6 125.4 90.4 129.6 89.6 134.6L89 137.6Z';

export const CAR_SHADE = shadeOf(CAR_BODY, 2.4, 3.4);

export const CAR_SHINE = 'M38.4 128.2C46 126.4 70 126 84 127C76 127.6 50 128 38.4 129.6Z';

export const CAR_WINDOW =
	'M50.4 123.4C52.4 118.4 55 115 58.8 114.6C63.4 114.2 67.4 114.4 70.4 114.8C72.6 115.2 74.6 118.4 76.4 123.4Z';

export const CAR_WINDOW_SHINE = 'M55 122.8L60.4 114.6L64 114.4L58.6 122.8Z';

export const CAR_PILLAR = 'M64 114.4L63.6 123.4';

export const CAR_DOOR = 'M48.6 125.6L48 135.6M64 126L64 135.6M57.6 129.6L60.6 129.6';

export const CAR_HEADLIGHT = ovalPath(87, 129.2, 2.4, 2.8);

export const CAR_TAIL_LIGHT = ovalPath(32.6, 130, 1.6, 2.4);

export const CAR_WHEELS = [
	{ cx: 44, cy: 139.6, spoke: 'M44 136.4L44 142.8M40.8 139.6L47.2 139.6' },
	{ cx: 77, cy: 139.6, spoke: 'M77 136.4L77 142.8M73.8 139.6L80.2 139.6' }
] as const;

export const CAR_WHEEL_RADIUS = 6.6;

export const CAR_HUB_RADIUS = 3.4;

/** The honk, drawn as a bubble with an exclamation mark and a few strokes of sound. */
export const HONK_BUBBLE =
	'M90 88C98 85.6 108 85.6 112.6 90C117 94.4 116.4 106 112 110C108.6 113.2 101 113.6 96 112.6L84.6 121.4L89 110.4C85.4 107 84.4 93 90 88Z';

export const HONK_MARK = {
	bar: 'M98.6 93.2C100.2 92.4 102 93 102 94.8L101.2 104C101 105.4 98.8 105.4 98.6 104L97.8 94.8C97.8 94 98.2 93.4 98.6 93.2Z',
	dot: ovalPath(100, 108.4, 1.8, 1.8)
} as const;

export const HONK_LINES =
	'M92 128.4C94.4 127 96.8 126.6 99.2 126.8M93.4 134C96 133.6 98.6 134 101 135M92 139.4C94.2 140 96.6 141.4 98.6 143';

/** Number of colors of the baby dinos: they follow one another in this order. */
export const BABY_VARIANTS = 4;
