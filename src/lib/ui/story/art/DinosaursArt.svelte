<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import StoryDino from '../StoryDino.svelte';

	const uid = $props.id();

	interface Props {
		/** One of `STORY_ART_GROUPS.dinosaurs`. */
		art: string;
	}

	/** A point of a limb's bone and the half-thickness of the limb there. */
	type Joint = readonly [x: number, y: number, r: number];
	type Point = readonly [x: number, y: number];

	interface Limb {
		/** Closed shape, to fill. */
		readonly d: string;
		/** Its contour without the top, which is hidden in the body. */
		readonly outline: string;
		/** Just inside its rounded end, and the way it points (degrees): where nails go. */
		readonly end: { readonly x: number; readonly y: number; readonly angle: number };
	}

	interface FormOptions {
		/** Patterns clipped to the shape. */
		inside?: Snippet;
		/** Darkened as a whole: the far leg, behind the body. */
		far?: boolean;
		bold?: boolean;
		/** Contour to stroke instead of the shape's own. */
		outline?: string;
	}

	let { art }: Props = $props();

	/** Unique id of a clip path or gradient of this picture. */
	const ref = (name: string): string => `${uid}-${name}`;
	const paint = (name: string): string => `url(#${ref(name)})`;
	const round = (v: number): number => Math.round(v * 100) / 100;
	const pair = (x: number, y: number): string => `${round(x)} ${round(y)}`;

	/** Moves a path made only of absolute coordinate pairs (no H, V or A command). */
	function shift(d: string, dx: number, dy: number): string {
		let index = 0;
		return d.replace(/-?\d*\.?\d+/g, (n) =>
			String(round(Number(n) + (index++ % 2 === 0 ? dx : dy)))
		);
	}

	const FRAME = 'M-40 -40L200 -40L200 140L-40 140Z';

	/** The rim of a shape that the light (top left) does not reach. */
	const shadeOf = (d: string): string => `${FRAME}${shift(d, -2, -3)}`;

	/** The item at index i of a list, i kept within it. */
	function at<T>(list: readonly T[], i: number): T {
		const item = list[Math.min(list.length - 1, Math.max(0, i))];
		if (item === undefined) throw new Error('empty list');
		return item;
	}

	/** A smooth curve through the points (Catmull-Rom) from point `from`, without its first move. */
	function curveThrough(points: readonly Point[], from = 0, to = points.length - 1): string {
		let d = '';
		for (let i = from; i < to; i++) {
			const [x0, y0] = at(points, i - 1);
			const [x1, y1] = at(points, i);
			const [x2, y2] = at(points, i + 1);
			const [x3, y3] = at(points, i + 2);
			d += `C${pair(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6)} ${pair(x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6)} ${pair(x2, y2)}`;
		}
		return d;
	}

	/** Half a rounded end from `from` to `to` around the bone end (x, y), the limb going along u. */
	function roundEnd(from: Point, to: Point, x: number, y: number, r: number, u: Point): string {
		const [ux, uy] = u;
		const [nx, ny] = [-uy, ux];
		const k = r * 0.55;
		const side = (to[0] - from[0]) * nx + (to[1] - from[1]) * ny > 0 ? 1 : -1;
		const tip: Point = [x + ux * r, y + uy * r];
		return (
			`C${pair(from[0] + ux * k, from[1] + uy * k)} ${pair(tip[0] - side * nx * k, tip[1] - side * ny * k)} ${pair(tip[0], tip[1])}` +
			`C${pair(tip[0] + side * nx * k, tip[1] + side * ny * k)} ${pair(to[0] + ux * k, to[1] + uy * k)} ${pair(to[0], to[1])}`
		);
	}

	/**
	 * An organic limb (leg, arm, toe) that tapers along its joints and ends rounded. The first
	 * `hidden` joints are inside the body: the outline starts where the limb comes out of it; with
	 * none hidden, the whole rounded shape is outlined (a thigh drawn on the body).
	 */
	function limb(joints: readonly Joint[], hidden = 1): Limb {
		const n = joints.length;
		const sides = joints.map(([x, y, r], i) => {
			const [ax, ay] = at(joints, i - 1);
			const [bx, by] = at(joints, i + 1);
			const span = Math.hypot(bx - ax, by - ay);
			const nx = -(by - ay) / span;
			const ny = (bx - ax) / span;
			return { a: [x + nx * r, y + ny * r] as Point, b: [x - nx * r, y - ny * r] as Point, nx, ny };
		});
		const front = sides.map((side) => side.a);
		const back = sides.map((side) => side.b).reverse();
		const [tx, ty, tr] = at(joints, n - 1);
		const last = at(sides, n - 1);
		const u: Point = [last.ny, -last.nx];
		const endCap = roundEnd(at(front, n - 1), at(back, 0), tx, ty, tr, u);
		const [sx, sy, sr] = at(joints, 0);
		const first = at(sides, 0);
		const startCap = roundEnd(at(back, n - 1), at(front, 0), sx, sy, sr, [-first.ny, first.nx]);
		const contour = (start: number): string =>
			`M${pair(...at(front, start))}` +
			curveThrough(front, start) +
			endCap +
			curveThrough(back, 0, n - 1 - start);
		const end = {
			x: round(tx + u[0] * (tr - 1)),
			y: round(ty + u[1] * (tr - 1)),
			angle: round((Math.atan2(u[1], u[0]) * 180) / Math.PI)
		};
		const closed = `${contour(0)}${startCap}Z`;
		return { d: closed, outline: hidden === 0 ? closed : contour(hidden), end };
	}

	/** Cone-shaped teeth along the segment a to b, pointing to its right side. */
	function fangPath(
		ax: number,
		ay: number,
		bx: number,
		by: number,
		count: number,
		length: number
	): string {
		const span = Math.hypot(bx - ax, by - ay);
		const ux = (bx - ax) / span;
		const uy = (by - ay) / span;
		const [nx, ny] = [uy, -ux];
		const half = span / count / 2;
		return Array.from({ length: count }, (_, i) => {
			const grow = i % 2 === 0 ? 1 : 0.7;
			const cx = ax + ux * half * (2 * i + 1) - nx * 1.5;
			const cy = ay + uy * half * (2 * i + 1) - ny * 1.5;
			const reach = length * grow + 1.5;
			const w = half * 0.85;
			return (
				`M${pair(cx - ux * w, cy - uy * w)}` +
				`Q${pair(cx - ux * w * 0.5 + nx * reach * 0.6, cy - uy * w * 0.5 + ny * reach * 0.6)} ${pair(cx + nx * reach - ux * w * 0.3, cy + ny * reach - uy * w * 0.3)}` +
				`Q${pair(cx + ux * w * 0.5 + nx * reach * 0.5, cy + uy * w * 0.5 + ny * reach * 0.5)} ${pair(cx + ux * w, cy + uy * w)}Z`
			);
		}).join('');
	}

	/** A fan of rounded bumps on a circle, closed through its centre (the triceratops' frill). */
	function scallopPath(
		cx: number,
		cy: number,
		r: number,
		from: number,
		to: number,
		count: number
	): string {
		const at = (deg: number, radius: number): string => {
			const rad = (deg * Math.PI) / 180;
			return pair(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius);
		};
		const step = (to - from) / count;
		let d = `M${pair(cx, cy)}L${at(from, r)}`;
		for (let i = 0; i < count; i++) {
			d += `Q${at(from + step * (i + 0.5), r + 3.2)} ${at(from + step * (i + 1), r)}`;
		}
		return `${d}Z`;
	}

	/** Leaf-shaped plate standing on (0, 0). */
	const NAIL = 'M-1.2 -1C0 -1.3 1.3 -0.9 1.3 0C1.3 0.9 0 1.3 -1.2 1Z';
	const NAIL_SPOTS = ['-0.7 -2.3', '0 0', '-0.7 2.3'] as const;

	const platePath = (height: number): string =>
		`M-4.5 3C-6 -3 -3 ${-height * 0.6} 0 ${-height}C3 ${-height * 0.6} 6 -3 4.5 3Z`;

	// Scenery
	const HILLS = 'M-4 8C14 -2 30 -4 46 2C60 -6 82 -8 100 0C116 -4 136 -6 164 2L164 40L-4 40Z';
	const VOLCANO =
		'M-26 0C-18 -4 -12 -16 -8 -25C-6 -29 -3 -29 0 -28C3 -29 6 -29 8 -25C12 -16 18 -4 26 0Z';
	const LAVA =
		'M-8 -25C-5 -27 5 -27 8 -25C6 -23 5 -20 4 -22C3 -18 1 -18 1 -22C-1 -19 -3 -19 -3 -23C-5 -21 -7 -22 -8 -25Z';
	const SMOKE =
		'M-4 -26C-8 -30 -7 -36 -2 -36C-2 -42 6 -44 9 -39C13 -42 19 -38 16 -33C19 -30 15 -26 11 -28C8 -26 4 -26 3 -27Z';
	const FERN_TRUNK = 'M-3 0C-3.5 -8 -2.5 -16 -2 -22C-1 -23 1 -23 2 -22C2.5 -16 3.5 -8 3 0Z';
	const FERN_RINGS = 'M-3 -5Q0 -3.5 3 -5M-2.8 -11Q0 -9.5 2.8 -11M-2.4 -17Q0 -15.5 2.4 -17';
	const FERN_FRONDS = [
		{
			leaf: 'M0 -22C6 -28 15 -28 21 -20C22 -18 21 -17 19.5 -18C14 -23 7 -23 0 -20Z',
			rib: 'M1 -21.5C7 -24.5 14 -24 19.5 -19'
		},
		{
			leaf: 'M0 -22C-6 -28 -15 -28 -21 -20C-22 -18 -21 -17 -19.5 -18C-14 -23 -7 -23 0 -20Z',
			rib: 'M-1 -21.5C-7 -24.5 -14 -24 -19.5 -19'
		},
		{
			leaf: 'M0 -22C3 -31 9 -36 16 -36C17 -35.5 17 -34.5 16 -34C10 -32 4 -28 0 -21Z',
			rib: 'M0.5 -22.5C4 -29 9 -33 15.5 -35'
		},
		{
			leaf: 'M0 -22C-3 -31 -9 -36 -16 -36C-17 -35.5 -17 -34.5 -16 -34C-10 -32 -4 -28 0 -21Z',
			rib: 'M-0.5 -22.5C-4 -29 -9 -33 -15.5 -35'
		},
		{ leaf: 'M-1 -21C-3 -28 -2 -34 0.5 -39C3 -34 3 -28 1 -21Z', rib: 'M0 -22L0.4 -37' }
	] as const;
	const TUFT =
		'M-4 0C-4 -3 -5 -5 -7 -6C-4 -6 -2 -4 -1 -2C-1 -5 0 -7 1 -9C1.5 -6 1.5 -4 1 -2C2 -4 4 -6 7 -6C5 -4 4 -2 4 0Z';

	// dino-opening and dino-ending: the companion's square and the point its hand holds.
	const COMPANION_SIDE = 120;
	const HAND: Point = [27, 89];
	const OPENING_DINO = { x: 46, y: 18, size: 74 } as const;
	const ENDING_DINO = { x: 2, y: 16, size: 72 } as const;
	const OPENING_HAND: Point = [
		OPENING_DINO.x + (HAND[0] * OPENING_DINO.size) / COMPANION_SIDE,
		OPENING_DINO.y + (HAND[1] * OPENING_DINO.size) / COMPANION_SIDE
	];
	const ENDING_HAND: Point = [
		ENDING_DINO.x + ENDING_DINO.size - (HAND[0] * ENDING_DINO.size) / COMPANION_SIDE,
		ENDING_DINO.y + (HAND[1] * ENDING_DINO.size) / COMPANION_SIDE
	];

	// dino-eggs: babies drawn facing right around the centre of their shell's rim.
	const BABIES = [
		{ x: 32, y: 80, tilt: 10, flip: -1, fill: 'baby-a', kind: 'spoon' },
		{ x: 80, y: 78, tilt: -20, flip: 1, fill: 'baby-c', kind: 'shout' },
		{ x: 128, y: 80, tilt: -4, flip: 1, fill: 'baby-b', kind: 'cap' }
	] as const;
	const BABY_HEAD =
		'M-9 -10C-9 -18 -11 -25 -10 -31C-9 -39 -4 -45 2 -46C6 -46.6 9.6 -48 11.8 -50C13.8 -51.6 16.6 -50.6 16.4 -47.8C16.2 -45.4 13.4 -42.6 7 -38.6C10 -38 13.4 -36.6 15.6 -34.8C17.4 -33.2 16 -30.6 13.4 -30C10.6 -29.4 8.6 -27.6 8 -24C7.6 -19 7 -14 8 -10Z';
	const BABY_SHELL =
		'M-15 -15C-13 -13 -12 -11 -11 -10C-10 -12 -8 -14 -7 -16C-6 -13 -4 -11 -3 -10C-2 -12 0 -14 1 -16C2 -13 4 -11 5 -10C6 -12 8 -14 9 -16C10 -13 12 -12 15 -14C16 -4 9 5 0 5C-9 5 -16 -4 -15 -15Z';
	const BABY_BIB = 'M-8.5 -27C-2 -24 4 -24 8.6 -27.4C11 -21 9 -14 3 -8C-2 -12 -6.5 -19 -8.5 -27Z';
	const BABY_ARM = limb([
		[2, -20, 2.2],
		[5, -19, 2.2],
		[10, -17.5, 1.7],
		[12.5, -14.5, 1.5]
	]);
	const BABY_SPOON_ARM = limb([
		[2, -21, 2.2],
		[5, -20.4, 2.2],
		[11, -21, 1.7],
		[15.6, -22.6, 1.6]
	]);
	const BABY_TAIL = limb([
		[-10, -6, 2.6],
		[-13, -6.4, 2.5],
		[-18, -8, 1.8],
		[-21, -12, 1.1]
	]);
	const BABY_CREST = [
		'M-5.6 -42.4C-7 -44.6 -7 -46.6 -5.8 -47.6C-4.4 -46.6 -3.4 -44.8 -3 -43.4Z',
		'M-8.6 -37C-10.6 -38.4 -11.4 -40.4 -10.8 -41.8C-9.2 -41.2 -7.8 -39.8 -7.2 -38.4Z',
		'M-9.8 -30.6C-12 -31.6 -13 -33.4 -12.6 -35C-11 -34.6 -9.6 -33.4 -9 -32Z'
	] as const;

	// dino-diplodocus
	const DIPLO_BODY =
		'M104 33C112 26 124 18 133 13C138 9 146 10 150 14C153 17 151 21 146 22C143 23 140 22 138 23C130 28 118 40 110 48C104 55 96 58 86 58C78 58 71 56 66 54C56 58 50 66 47 76C46 80 46 84 45 88C43 89 41 88 41 85C41 72 48 50 64 40C76 32 94 29 104 33Z';
	const DIPLO_FRONT = limb([
		[101, 51, 6],
		[104, 55, 6],
		[110, 60, 4.4],
		[115, 66, 3.8],
		[118, 70, 3.8]
	]);
	const DIPLO_FRONT_FAR = limb([
		[105, 46, 6.5],
		[108, 51, 6],
		[116, 55, 4.2],
		[119, 61, 3.6],
		[118, 65, 3.4]
	]);
	const DIPLO_HIND = limb([
		[72, 51, 7],
		[73, 55, 7.2],
		[70, 61, 5],
		[61, 65, 3.8],
		[56, 65.5, 3.8]
	]);
	const DIPLO_HIND_FAR = limb([
		[78, 44, 8.5],
		[79, 50, 8],
		[78, 58, 4.8],
		[70, 62, 3.6],
		[65, 62.5, 3.6]
	]);
	const RIVER =
		'M74 58C70 66 56 74 30 84C24 87 20 92 18 100L142 100C140 92 134 86 126 82C106 74 92 66 86 58Z';
	const BANK_LEFT = 'M-4 60C20 58 50 58 74 58C70 66 56 74 30 84C24 87 20 92 18 100L-4 100Z';
	const BANK_RIGHT =
		'M86 58C110 58 140 57 164 58L164 100L142 100C140 92 134 86 126 82C106 74 92 66 86 58Z';

	// dino-nest
	const TRI_BODY =
		'M70 50C80 38 104 36 118 44C128 50 138 58 150 62C146 66 134 67 120 66C114 72 104 76 92 76C80 76 70 72 66 64C64 58 66 54 70 50Z';
	const TRI_HEAD =
		'M74 50C70 43 60 42 53 46C48 49 44 53 41 57C38 60 37 64 40 66C42 67 44 66 46 64C49 67 54 70 61 70C68 70 74 66 76 60C77 56 76 53 74 50Z';
	const TRI_FRILL = scallopPath(72, 50, 17, 160, 380, 9);
	const TRI_HORN = 'M64 46C58 40 48 33 36 30C40 34 46 40 56 50Z';
	const TRI_NOSE_HORN = 'M46 54C44 50 43 47 44 44C47 47 49 50 51 53Z';
	const TRI_FRONT = limb([
		[78, 56, 10],
		[79, 66, 9.5],
		[80, 76, 7],
		[79, 83, 6.4],
		[75, 87, 5]
	]);
	const TRI_FRONT_FAR = limb([
		[86, 58, 8.6],
		[87, 64, 8.8],
		[88, 73, 6.6],
		[87, 80, 6],
		[83, 84.5, 4.8]
	]);
	const TRI_HIND = limb([
		[110, 54, 12],
		[110, 64, 12],
		[107, 74, 7.8],
		[110, 82, 6.4],
		[106, 87, 5]
	]);
	const TRI_HIND_FAR = limb([
		[118, 57, 10],
		[118, 62, 10.6],
		[115, 71, 7.4],
		[118, 79, 6],
		[114, 84, 4.8]
	]);

	// dino-pond
	const STEGO_BODY =
		'M28 50C38 54 48 54 56 50C64 36 90 31 104 42C110 48 116 52 122 54C126 52 132 52 136 55C139 58 139 63 135 65C131 66 126 66 122 65C116 66 110 68 104 70C96 74 74 76 60 70C52 66 42 60 30 55C27 54 26 51 28 50Z';
	const STEGO_HIND = limb([
		[64, 52, 11],
		[64, 60, 11],
		[69, 70, 7.4],
		[67, 80, 6],
		[71, 86, 4.8]
	]);
	const STEGO_HIND_FAR = limb([
		[72, 56, 9],
		[72, 60, 9.6],
		[77, 67, 7],
		[75, 77, 5.6],
		[79, 83, 4.6]
	]);
	const STEGO_FRONT = limb([
		[104, 58, 8],
		[104, 64, 8],
		[103, 73, 6.2],
		[104, 81, 5.4],
		[108, 86, 4.4]
	]);
	const STEGO_FRONT_FAR = limb([
		[110, 60, 7],
		[110, 63, 7.4],
		[109.5, 71, 5.8],
		[111, 79, 5],
		[115, 84, 4.2]
	]);
	const STEGO_PLATES = [
		{ x: 60, y: 45, tilt: -40, height: 9 },
		{ x: 68, y: 39, tilt: -25, height: 12 },
		{ x: 78, y: 35, tilt: -10, height: 14 },
		{ x: 89, y: 34, tilt: 6, height: 14 },
		{ x: 98, y: 37, tilt: 22, height: 12 },
		{ x: 106, y: 43, tilt: 38, height: 9 },
		{ x: 113, y: 48, tilt: 52, height: 6 }
	] as const;
	const STEGO_SPIKES = [
		'M40 54C38 49 35 45.6 31 43.6C32.6 47.6 34 51 35 55Z',
		'M46 54.4C45 48.6 43 45 40 42.4C41 46.6 41.6 50.6 41.6 55Z',
		'M37 56C33.6 58.6 30 60.6 25.6 61C29 58 31.6 56.4 33.6 55Z',
		'M43 57.6C40.6 61.4 37.6 64 34 65.4C36.4 62 38.4 59.6 39.6 57Z'
	] as const;
	const POND =
		'M18 84C22 76 60 74 80 74C104 74 138 76 142 84C146 92 110 97 80 97C50 97 14 92 18 84Z';

	// dino-raptor
	const RAPTOR_BODY =
		'M70 32C71 28 76 26 82 25C88 23.5 95 23 99 25.5C103 28 104 32 103 36C104 41 106 45 111 47C120 46 132 43 142 39C147 37 151 35 156 33L157 38C152 42 148 45 143 49C136 54 128 59 120 61C112 63 104 62 100 58C97 54 96 48 92 44C89 41 85 39.5 81 39C76 38.5 71 36 70 32Z';
	const RAPTOR_LEG = limb(
		[
			[119, 53, 8.5],
			[110, 66, 4.6],
			[121, 77, 2.6],
			[117, 86, 2.3],
			[109, 88, 1.5]
		],
		0
	);
	const RAPTOR_LEG_FAR = limb(
		[
			[126, 54, 7.5],
			[118, 64, 4.2],
			[129, 74, 2.4],
			[126, 84, 2.2],
			[119, 86.6, 1.5]
		],
		0
	);
	const RAPTOR_TOE = limb([
		[117, 86.4, 2],
		[112, 89.2, 1.4],
		[108.6, 89.6, 1]
	]);
	const RAPTOR_ARM = limb([
		[100, 46, 3.8],
		[100, 51, 3.8],
		[103, 58, 2.8],
		[93, 61, 2.1],
		[89, 61, 1.9]
	]);
	const RAPTOR_FINGERS = [
		limb([
			[89, 60, 1.5],
			[86, 58.4, 1.2],
			[84.6, 60, 0.9]
		]),
		limb([
			[89, 62, 1.5],
			[86, 63.6, 1.2],
			[84.8, 62, 0.9]
		])
	] as const;
	const PENCIL = { x: 63, y: 71.5, angle: -26.6, length: 30 } as const;

	// dino-trex
	const TREX_BODY =
		'M88 26C96 26 104 30 112 34C124 39 138 36 150 30C154 28 157 26.4 159 26.6C161 27 160.6 29.6 158.6 30.8C150 37 140 46 130 56C124 64 114 72 102 73C92 74 84 68 82 58C80 50 80 40 82 34C83 30 85 27 88 26Z';
	const TREX_BELLY =
		'M78 40C80 54 88 64 102 65C114 65.4 122 58.6 128 51.6C136 43 146 36.4 158 30L164 40L164 84L70 84Z';
	const TREX_SKULL =
		'M40 38C36.6 37.6 35 34 35.4 30.6C35.8 27.6 37.4 26.2 40 25.6C47.6 22.6 55.4 20.8 62 19.4C66 18.2 68.4 15.2 72.4 13.6C78 11.6 86 12 91 15.4C96 19 98 26 97.6 32C97 39 93 46 86 48C82 49 79 47.6 77 45.2C70 41.6 58 38.6 46 38.2C43 38.1 41.4 38.1 40 38Z';
	const TREX_JAW =
		'M84 46C90 48 92 55 87 59.6C81 64.6 70 69 60 71C54.6 72 50 71.2 49.4 67.6C48.8 64.4 50.6 62.4 54 61.4C62 59 70 55 77.4 50.6C79.6 49 81.6 46.8 84 46Z';
	const TREX_MOUTH =
		'M39 36.6C52 37 66 40 80 44.4L88 50C80 53 68 58 53 63.2C46 56 41.4 46 39 36.6Z';
	const TREX_TONGUE =
		'M88 53C78 54 68 57.6 60 59.6C55 60.8 52 59.2 52.4 56C52.8 53 55.6 51.8 59 51.6C68 50.8 77 48 86 45.4Z';
	const TREX_BROW =
		'M72 20.6C73.6 15.6 83.6 14.4 88.2 18.6C89.2 19.6 88.6 21 87.2 20.8C82.6 19.4 76.6 19.6 72 20.6Z';
	/** Back stripes: where each starts on the spine, its tilt and its length. */
	const TREX_STRIPES = [
		{ x: 99, y: 28.6, tilt: 24, length: 8 },
		{ x: 107, y: 31.8, tilt: 24, length: 9 },
		{ x: 115.6, y: 35.4, tilt: 16, length: 9 },
		{ x: 124.4, y: 37.4, tilt: 2, length: 8 },
		{ x: 133, y: 36.6, tilt: -12, length: 7 },
		{ x: 141.4, y: 34, tilt: -22, length: 5.6 },
		{ x: 149, y: 30, tilt: -28, length: 4 }
	] as const;
	const stripePath = (length: number): string =>
		`M-2.2 -1C-2 ${length * 0.5} -1 ${length * 0.85} 0 ${length}C1 ${length * 0.85} 2 ${length * 0.5} 2.2 -1Z`;
	/** Belly scales: a short crease across the belly at each point, along its tilt. */
	const TREX_SCALES = [
		{ x: 89.4, y: 65.6, tilt: 40 },
		{ x: 133.4, y: 49.4, tilt: -48 },
		{ x: 139.6, y: 44, tilt: -42 },
		{ x: 145.6, y: 39.4, tilt: -36 },
		{ x: 151.4, y: 35.4, tilt: -32 }
	] as const;
	const TREX_LEG = limb(
		[
			[114, 56, 13],
			[103, 70, 6.5],
			[110, 82, 4],
			[104, 87.4, 3.4],
			[95, 88.5, 2.4]
		],
		0
	);
	const TREX_LEG_FAR = limb(
		[
			[124, 52, 11],
			[116, 66, 5.5],
			[126, 78, 3.6],
			[123, 86, 3],
			[115, 87.5, 2]
		],
		0
	);
	const TREX_TOE = limb([
		[105, 87.6, 2.6],
		[99, 89.8, 1.8],
		[96, 90, 1.3]
	]);
	const TREX_ARM = limb([
		[93, 58, 4],
		[93, 62, 4],
		[96, 68, 3],
		[90, 71, 2.4],
		[86, 71, 2]
	]);
	const TREX_FINGERS = [
		limb([
			[86.6, 70, 1.6],
			[83, 68.4, 1.3],
			[81.6, 70, 1]
		]),
		limb([
			[86.6, 72.2, 1.6],
			[83.2, 74, 1.3],
			[81.8, 72.2, 1]
		])
	] as const;
	const TREX_UPPER_TEETH =
		fangPath(75, 44, 61, 39.6, 3, 4.4) + fangPath(60, 39.2, 42, 38.2, 3, 4.6);
	const TREX_LOWER_TEETH = fangPath(55, 61.6, 76, 51.6, 4, 4.4);
</script>

{#snippet sky(bottom: string)}
	<linearGradient id={ref('sky')} x1="0" y1="0" x2="0" y2="1">
		<stop offset="0" class="stop-sky" />
		<stop offset="1" class={bottom} />
	</linearGradient>
	<rect width="160" height="100" fill={paint('sky')} />
{/snippet}

{#snippet hills(y: number)}
	<g transform="translate(0 {y})">
		<path class="leaf thin-line" d={HILLS} />
		<path class="haze" d={HILLS} />
	</g>
{/snippet}

{#snippet volcano(x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		<path class="white thin-line" d={SMOKE} />
		<path class="rock thin-line" d={VOLCANO} />
		<path class="spark thin-line" d={LAVA} />
		<path class="haze" d={VOLCANO} />
	</g>
{/snippet}

{#snippet fern(x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		<path class="wood line" d={FERN_TRUNK} />
		<path class="open thin-line" d={FERN_RINGS} />
		{#each FERN_FRONDS as frond (frond.rib)}
			<path class="leaf line" d={frond.leaf} />
			<path class="open thin-line" d={frond.rib} />
		{/each}
		<ellipse class="leaf line" cx="0" cy="-22" rx="2.4" ry="1.6" />
	</g>
{/snippet}

{#snippet tuft(x: number, y: number, s: number)}
	<path class="leaf thin-line" transform="translate({x} {y}) scale({s})" d={TUFT} />
{/snippet}

{#snippet form(name: string, d: string, fill: string, options: FormOptions = {})}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={paint(name)}>
		{@render options.inside?.()}
		<path class="shade" fill-rule="evenodd" d={shadeOf(d)} />
		{#if options.far}
			<path class="shade" d={FRAME} />
		{/if}
	</g>
	<path class={['open', 'line', options.bold && 'bold']} d={options.outline ?? d} />
{/snippet}

{#snippet member(name: string, shape: Limb, fill: string, far = false)}
	{@render form(name, shape.d, fill, { outline: shape.outline, far })}
{/snippet}

{#snippet nails(shape: Limb, s: number)}
	<g transform="translate({shape.end.x} {shape.end.y}) rotate({shape.end.angle}) scale({s})">
		{#each NAIL_SPOTS as spot (spot)}
			<path class="paper thin-line" transform="translate({spot})" d={NAIL} />
		{/each}
	</g>
{/snippet}

{#snippet eye(x: number, y: number, r: number, lookX: number, lookY: number)}
	<ellipse class="white line" cx={x} cy={y} rx={r} ry={r * 1.08} />
	<circle class="dark" cx={x + lookX} cy={y + lookY} r={r * 0.52} />
	<circle class="white" cx={x + lookX + r * 0.2} cy={y + lookY - r * 0.22} r={r * 0.18} />
{/snippet}

{#snippet baby(b: (typeof BABIES)[number])}
	<g transform="translate({b.x} {b.y}) rotate({b.tilt}) scale({b.flip} 1)">
		{@render member(`baby-tail-${b.kind}`, BABY_TAIL, b.fill)}
		{#each BABY_CREST as spike (spike)}
			<path class="a line" d={spike} />
		{/each}
		<path class="ink" d="M5 -38.4C9 -41 13 -43.6 16.6 -46.4C15.8 -42 16 -38 17.4 -33.8Z" />
		<path
			class="f thin-line"
			d="M8 -38.2C10.6 -39.8 14 -39.4 16.2 -37C14.4 -35.6 11 -36 8 -38.2Z"
		/>
		<path
			class="white thin-line"
			d="M12.4 -43.4L13.6 -41.6L14.4 -44.2ZM9.6 -41.4L10.8 -39.8L11.6 -42.2Z"
		/>
		{#snippet babyInside()}
			<ellipse class="light" cx="-4" cy="-41" rx="3.4" ry="2" transform="rotate(-30 -4 -41)" />
			<path
				class="sand"
				d="M9 -30.4C11 -29.4 14 -29.6 18 -30L20 -10L8 -10C7.2 -17 7.6 -25 9 -30.4Z"
			/>
		{/snippet}
		{@render form(`baby-${b.kind}`, BABY_HEAD, b.fill, { inside: babyInside })}
		<circle class="dark" cx="14.2" cy="-48.6" r="0.55" />
		{#if b.kind === 'shout'}
			<path class="open line" d="M-2 -39Q1 -41.5 4 -38.6" />
			<path class="open line" d="M-2.6 -43.4L4 -41.4" />
		{:else}
			{@render eye(1, -39, 3, 0.8, -0.7)}
			<path class="open line" d="M-2.4 -44Q1 -45.8 4.4 -44.2" />
		{/if}
		{#if b.kind === 'cap'}
			<path
				class="shell line"
				transform="rotate(-12 0 -44)"
				d="M-9 -42C-9 -50 -3 -54 2 -53C7 -52 10 -48 9 -43C7 -45 5.5 -44 4 -42.5C3 -44.5 1 -45.5 -1 -43.5C-3 -45.5 -5 -45.5 -6 -43.5C-7 -45 -8 -44 -9 -42Z"
			/>
			<circle class="egg-spot" cx="-3" cy="-50" r="1.3" />
			<circle class="egg-spot" cx="3" cy="-50.6" r="1" />
		{/if}
		<path class="shell line" d={BABY_SHELL} />
		<circle class="egg-spot" cx="-7" cy="-6" r="1.8" />
		<circle class="egg-spot" cx="6" cy="-8" r="1.4" />
		<circle class="egg-spot" cx="2" cy="-1" r="1.6" />
		<path class="shade" d="M15 -14C16 -4 9 5 0 5C6 2 10 -4 11 -12Z" />
		<path class="white line" d={BABY_BIB} />
		<circle class="a" cx="-3" cy="-21" r="1" />
		<circle class="a" cx="2" cy="-21.6" r="1" />
		<circle class="a" cx="6" cy="-20" r="1" />
		<circle class="a" cx="0.6" cy="-16.6" r="1" />
		<circle class="a" cx="4.6" cy="-15.6" r="1" />
		<path
			class="white line"
			d="M-8.4 -27C-11 -29.4 -13.4 -28.6 -13.6 -26.6C-11.6 -25.4 -9.6 -25.6 -8.4 -26.4Z"
		/>
		<path
			class="white line"
			d="M-8.4 -26.4C-11 -25 -12.2 -22.8 -11.2 -21.6C-9.4 -22.2 -8.4 -24 -8.2 -25.8Z"
		/>
		{#if b.kind === 'spoon'}
			<path
				class="metal line"
				d="M16.2 -16C16.6 -20 17.2 -24 17.8 -28L18.8 -28C18.6 -24 18 -20 17.6 -16Z"
			/>
			<ellipse
				class="metal line"
				cx="18.6"
				cy="-31.6"
				rx="2.3"
				ry="3.4"
				transform="rotate(8 18.6 -31.6)"
			/>
			{@render member(`baby-hand-${b.kind}`, BABY_SPOON_ARM, b.fill)}
		{:else}
			{@render member(`baby-hand-${b.kind}`, BABY_ARM, b.fill)}
		{/if}
	</g>
{/snippet}

{#if art === 'dino-opening'}
	<g data-story-art="dino-opening">
		{@render sky('stop-paper')}
		<circle class="star line" cx="144" cy="15" r="8" />
		<circle class="light" cx="141.4" cy="12.4" r="2.6" />
		{@render volcano(122, 63, 0.8)}
		{@render hills(58)}
		<path class="grass line" d="M-4 72C30 68 60 68 90 70C120 72 140 70 164 69L164 104L-4 104Z" />
		<path
			class="sand thin-line"
			d="M70 70C78 76 70 82 58 88C48 93 46 98 44 104L84 104C80 96 86 90 92 84C98 78 90 74 82 70Z"
		/>
		{@render fern(10, 80, 1.1)}
		{@render fern(150, 80, 1.2)}
		<g>
			<path class="wood line" d="M28.5 86C28 76 28.5 64 28 56L31.6 56C31.2 64 31.6 76 32.2 86Z" />
			<path
				class="wood line"
				d="M20 58C26 57 34 57 40 58L44 62L40 66C34 67 26 67 20 66C19 63.4 19 60.6 20 58Z"
			/>
			<g class="dark">
				<ellipse cx="30" cy="63.2" rx="1.6" ry="1.2" />
				<circle cx="28.4" cy="61" r="0.55" />
				<circle cx="30" cy="60.4" r="0.55" />
				<circle cx="31.6" cy="61" r="0.55" />
			</g>
		</g>
		<ellipse class="shade" cx={OPENING_DINO.x + 37} cy={OPENING_DINO.y + 69} rx="27" ry="4" />
		<path
			class="wood line"
			d="M99 56C103 46 107 36 111.4 25.6L113.6 26.6C109.4 37 105.4 47 101.6 57Z"
		/>
		<path
			class="a line"
			d="M111.6 26.4C115 26 118.4 27.4 121 29.4C118 30.4 114.6 31.2 110.4 30.4Z"
		/>
		<path class="l line" d="M59 56C59 47 67 43 83 43C99 43 107 47 107 56L107 72L59 72Z" />
		<path
			class="h line"
			d="M63 51C63 46.6 70 44.6 83 44.6C96 44.6 103 46.6 103 51C96 53.4 70 53.4 63 51Z"
		/>
		<StoryDino x={OPENING_DINO.x} y={OPENING_DINO.y} size={OPENING_DINO.size} />
		<path class="l line" d="M71 62C70 68 70 75 71.4 81L74.8 80.6C73.6 75 73.6 68 74.4 62.4Z" />
		<path class="l line" d="M95 62C96 68 96 75 94.6 81L91.2 80.6C92.4 75 92.4 68 91.6 62.4Z" />
		<g
			transform="translate({OPENING_HAND[0]} {OPENING_HAND[1]}) rotate(-4) scale(0.78) translate(-1 -10)"
		>
			<path
				class="a line"
				d="M-1 2C10 0 18 1 20 4C22 1 30 0 41 2L41 26C30 24 22 25 20 28C18 25 10 24 -1 26Z"
			/>
			<path class="paper line" d="M1 3C10 1 17 2 20 5L20 26C17 23 10 23 1 24Z" />
			<path class="paper line" d="M39 3C30 1 23 2 20 5L20 26C23 23 30 23 39 24Z" />
			<path class="shade" d="M20 5C18.6 4 17 3.6 16 3.6L16 23.6C17.4 23.8 18.8 24.6 20 26Z" />
			<path
				class="shade"
				d="M20 5C19.4 4.6 18.8 4.4 18.2 4.4L18.2 24.4C18.8 24.8 19.4 25.4 20 26Z"
			/>
			<path class="shade" d="M20 5C21.4 4 23 3.6 24 3.6L24 23.6C22.6 23.8 21.2 24.6 20 26Z" />
			<path
				class="shade"
				d="M20 5C20.6 4.6 21.2 4.4 21.8 4.4L21.8 24.4C21.2 24.8 20.6 25.4 20 26Z"
			/>
			<path class="d line" d="M19 27C19 30 18 32 17 34L19 33L20.5 35C21 32 21 30 21 27Z" />
		</g>
	</g>
{:else if art === 'dino-eggs'}
	<g data-story-art="dino-eggs">
		{@render sky('stop-paper')}
		{@render volcano(132, 54, 0.8)}
		{@render hills(50)}
		<path class="grass line" d="M-4 64C30 60 70 60 100 62C130 64 146 62 164 61L164 104L-4 104Z" />
		{@render fern(10, 70, 1.2)}
		{@render fern(152, 68, 1)}
		<path
			class="wood line"
			d="M8 80C10 70 30 64 80 64C130 64 150 70 152 80C150 96 120 102 80 102C40 102 10 96 8 80Z"
		/>
		<path
			class="soil thin-line"
			d="M18 76C24 70 50 68 80 68C110 68 136 70 142 76C130 80 110 82 80 82C50 82 30 80 18 76Z"
		/>
		<path
			class="open wood-dark"
			d="M24 75C30 73 36 72.4 42 72.6M56 70.6C62 70 68 70 74 70.4M98 70.2C104 70 110 70.4 116 71M120 74C126 73.4 132 74 136 75.2M30 78.4C36 77.6 42 77.8 48 78.6"
		/>
		{#each BABIES as b (b.kind)}
			{@render baby(b)}
		{/each}
		<path
			class="wood line"
			d="M6 80C14 86 40 90 80 90C120 90 146 86 154 80C154 92 128 102 80 102C32 102 6 92 6 80Z"
		/>
		<path
			class="open wood-dark"
			d="M14 86C24 90 34 92 44 92M52 94C66 96 84 96 98 94M108 93C120 92 132 89 144 86M10 84C20 92 40 98 60 99M150 85C140 94 120 99 100 100M30 96C50 101 80 102 110 99"
		/>
	</g>
{:else if art === 'dino-diplodocus'}
	<g data-story-art="dino-diplodocus">
		{@render sky('stop-paper')}
		{@render volcano(22, 60, 0.8)}
		{@render hills(52)}
		<linearGradient id={ref('river')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-water" />
			<stop offset="1" class="stop-water-deep" />
		</linearGradient>
		<path d={RIVER} fill={paint('river')} />
		<path
			class="ripple"
			d="M78 64Q81 63 84 64M70 72Q75 70 80 72M96 76Q102 74 108 76M60 92Q68 90 76 92M100 92Q108 90 116 92"
		/>
		<path class="grass line" d={BANK_LEFT} />
		<path class="grass line" d={BANK_RIGHT} />
		<path class="open soil-stroke" d="M72 61C66 68 52 76 32 85M88 61C96 68 110 75 124 81" />
		{@render fern(10, 76, 1.1)}
		{@render fern(150, 70, 1)}
		<path class="open wood-stroke" d="M134 84C133 78 133 72 135 66M140 86C140 80 141 74 143 69" />
		<ellipse class="p line" cx="135" cy="68" rx="1.6" ry="4" transform="rotate(10 135 68)" />
		<ellipse class="p line" cx="143.2" cy="71" rx="1.6" ry="4" transform="rotate(15 143 71)" />
		<ellipse class="shade" cx="92" cy="80" rx="22" ry="3" />
		<path class="open thin-line" d="M52 30Q60 24 72 23M44 40Q50 34 58 33" />
		{@render member('diplo-front-far', DIPLO_FRONT_FAR, 'g', true)}
		{@render member('diplo-hind-far', DIPLO_HIND_FAR, 'g', true)}
		{#snippet diploInside()}
			<path
				class="c"
				d="M150 22C140 24 136 24 132 27C124 34 114 44 106 49C99 53 92 54 85 54C78 54 72 52 66 50C58 54 52 62 49 72L44 100L170 100L170 22Z"
			/>
			<ellipse class="a" cx="78" cy="38" rx="3.4" ry="2" transform="rotate(-12 78 38)" />
			<ellipse class="a" cx="89" cy="35" rx="3.6" ry="2.2" />
			<ellipse class="a" cx="100" cy="37" rx="2.6" ry="1.8" transform="rotate(10 100 37)" />
			<ellipse class="a" cx="69" cy="43" rx="2.2" ry="1.5" transform="rotate(-30 69 43)" />
			<ellipse class="a" cx="114" cy="31" rx="2" ry="1.4" transform="rotate(-35 114 31)" />
			<ellipse class="a" cx="58" cy="50" rx="1.8" ry="1.3" transform="rotate(-50 58 50)" />
			<path class="light" d="M66 40C76 33 92 31 102 34C92 33 78 35 68 42Z" />
			<path class="light" d="M134 14C138 11 144 11 148 13C144 12.5 139 13 135 15Z" />
		{/snippet}
		{@render form('diplo-body', DIPLO_BODY, 'g', { inside: diploInside, bold: true })}
		{@render member('diplo-hind', DIPLO_HIND, 'g')}
		{@render nails(DIPLO_HIND, 0.7)}
		{@render member('diplo-front', DIPLO_FRONT, 'g')}
		{@render nails(DIPLO_FRONT, 0.7)}
		{@render eye(142.6, 15.4, 2.5, 0.8, 0.2)}
		<path
			class="g line"
			d="M139.8 14.6C140 12 145 11.6 145.4 14.4C143.6 13.4 141.6 13.6 139.8 14.6Z"
		/>
		<path class="open line" d="M139.6 11.4Q142.6 9.8 146 11.6" />
		<circle class="dark" cx="149" cy="15.2" r="0.6" />
		<path
			class="open line"
			d="M151 19.4C148 20.6 144 20.8 141.4 20.2C140.6 20 140.2 19.4 140.4 18.8"
		/>
		<path class="water" d="M36 86C38 84 48 84 50 86C48 88.5 38 88.5 36 86Z" />
		<ellipse class="ripple" cx="43" cy="86.5" rx="8" ry="1.8" />
		<ellipse class="ripple" cx="43" cy="87" rx="13" ry="3" />
		<path
			class="water thin-line"
			d="M31 87.4C32 85 33 83 33.2 80.6C34.6 82.4 35.4 84.4 36 85.6C36.4 83 37.4 80.6 38.8 79C39.4 81.6 39.6 83.6 39.4 85.4L47 85.4C46.8 83.6 47 81.6 47.6 79C49 80.6 50 83 50.4 85.6C51 84.4 51.8 82.4 53.2 80.6C53.4 83 54.4 85 55.4 87.4C48 89 38 89 31 87.4Z"
		/>
		<circle class="water thin-line" cx="37.6" cy="75.6" r="1" />
		<circle class="water thin-line" cx="49.2" cy="75.4" r="0.9" />
	</g>
{:else if art === 'dino-nest'}
	<g data-story-art="dino-nest">
		{@render sky('stop-paper')}
		{@render hills(54)}
		{@render fern(132, 64, 0.9)}
		<path class="grass line" d="M-4 72C30 68 70 68 100 70C130 72 146 70 164 69L164 104L-4 104Z" />
		<path
			class="wood line"
			d="M120 76C122 70 140 68 152 70C160 72 164 76 164 80L164 88C150 92 128 90 122 86Z"
		/>
		<ellipse class="shell line" cx="134" cy="72" rx="5.5" ry="7" />
		<ellipse class="shell line" cx="146" cy="70.5" rx="5.5" ry="7" />
		<circle class="egg-spot" cx="132.5" cy="70" r="1.4" />
		<circle class="egg-spot" cx="148" cy="68.5" r="1.4" />
		<path
			class="wood line"
			d="M118 78C126 82 146 84 164 80L164 92C146 96 124 94 118 88C116 85 116 81 118 78Z"
		/>
		<path class="open wood-dark" d="M122 84C132 87 146 88 160 86M124 89C136 92 150 92 162 90" />
		<g>
			<path class="wood line" d="M19 92C19.5 78 20 62 19.5 46L25 46C24.5 62 25 78 26 92Z" />
			<path
				class="wood line"
				d="M4 22C4 19 6 18 9 18L37 18C40 18 41 19 41 22L41 46C41 49 40 50 37 50L9 50C6 50 4 49 4 46Z"
			/>
			<path
				class="sand thin-line"
				d="M7 23C7 21.5 8 21 9.5 21L35.5 21C37 21 38 21.5 38 23L38 45C38 46.5 37 47 35.5 47L9.5 47C8 47 7 46.5 7 45Z"
			/>
			<path
				class="open metal-stroke"
				d="M17.5 33L17.5 29C17.5 25 20 23.5 22.5 23.5C25 23.5 27.5 25 27.5 29L27.5 33"
			/>
			<path
				class="star line"
				d="M15 32.5C15 31.5 15.5 31 16.5 31L28.5 31C29.5 31 30 31.5 30 32.5L30 39.5C30 40.5 29.5 41 28.5 41L16.5 41C15.5 41 15 40.5 15 39.5Z"
			/>
			<path
				class="dark"
				d="M22.5 33.5C21.4 33.5 20.8 34.4 20.8 35.2C20.8 35.9 21.2 36.4 21.7 36.6L21.3 38.8L23.7 38.8L23.3 36.6C23.8 36.4 24.2 35.9 24.2 35.2C24.2 34.4 23.6 33.5 22.5 33.5Z"
			/>
			<circle class="dark" cx="14.5" cy="44" r="1.2" />
			<circle class="dark" cx="19.5" cy="44" r="1.2" />
			<circle class="dark" cx="24.5" cy="44" r="1.2" />
			<circle class="dark" cx="29.5" cy="44" r="1.2" />
		</g>
		<ellipse class="shade" cx="96" cy="91" rx="40" ry="4" />
		{@render member('tri-front-far', TRI_FRONT_FAR, 'h', true)}
		{@render member('tri-hind-far', TRI_HIND_FAR, 'h', true)}
		{#snippet triInside()}
			<path class="d" d="M60 62C74 72 96 74 120 64L130 100L60 100Z" />
			<path class="light" d="M76 44C86 38 102 38 112 42C100 40 86 41 78 46Z" />
		{/snippet}
		{@render form('tri-body', TRI_BODY, 'h', { inside: triInside, bold: true })}
		{@render member('tri-hind', TRI_HIND, 'h')}
		{@render nails(TRI_HIND, 0.9)}
		{@render member('tri-front', TRI_FRONT, 'h')}
		{@render nails(TRI_FRONT, 0.9)}
		{#snippet frillInside()}
			<path
				class="open frill-stroke"
				d="M72 50L58 37M72 50L64 33M72 50L72 31M72 50L81 32M72 50L88 38M72 50L91 47"
			/>
			<circle class="c" cx="61.6" cy="36.4" r="2" />
			<circle class="c" cx="76.8" cy="32.6" r="2" />
			<circle class="c" cx="88.6" cy="42.4" r="2" />
		{/snippet}
		{@render form('tri-frill', TRI_FRILL, 'm', { inside: frillInside })}
		{@render form('tri-horn-far', shift(TRI_HORN, 6, -3), 'paper', { far: true })}
		{@render form('tri-horn', TRI_HORN, 'paper')}
		{@render form('tri-nose-horn', TRI_NOSE_HORN, 'paper')}
		{#snippet headInside()}
			<path class="sand" d="M30 50C38 54 44 58 47 65L30 75Z" />
			<path class="light" d="M54 47C58 44 64 44 68 45C63 45 58 46 55 49Z" />
		{/snippet}
		{@render form('tri-head', TRI_HEAD, 'h', { inside: headInside, bold: true })}
		<path class="open line" d="M41 57C44 59 46 62 46 64" />
		<path class="open line" d="M46 64C52 66 57 66 61 64.5" />
		{@render eye(59, 53, 2.6, -1, 0.4)}
		<path class="h line" d="M56.2 52.4C56.4 49.4 61.6 49.4 61.8 52.4Z" />
		<path class="open line" d="M55.5 48.8L62.5 48.4" />
		<circle class="dark" cx="43.4" cy="57.4" r="0.6" />
	</g>
{:else if art === 'dino-pond'}
	<g data-story-art="dino-pond">
		{@render sky('stop-paper')}
		{@render hills(52)}
		<path class="grass line" d="M-4 68C30 64 70 64 100 66C130 68 146 66 164 65L164 104L-4 104Z" />
		{@render fern(12, 72, 1)}
		{@render fern(150, 70, 1.1)}
		<path class="water thin-line" d="M0 80C4 76 18 76 22 79C26 82 18 86 8 85C2 85 -2 83 0 80Z" />
		<path
			class="water thin-line"
			d="M140 80C144 76 158 76 162 79L164 86C156 86 146 86 142 84C138 83 138 81 140 80Z"
		/>
		<path class="water thin-line" d="M-4 94C4 90 18 90 22 94C24 98 10 100 -4 100Z" />
		<path
			class="water thin-line"
			d="M136 96C140 92 156 91 164 93L164 100C152 101 138 100 136 96Z"
		/>
		<path
			class="ripple"
			d="M5 80.6Q9 79.4 13 80.6M146 80.4Q150 79.2 154 80.4M3 95.4Q8 94 13 95.4M146 96Q151 94.6 156 96"
		/>
		<path
			class="water thin-line"
			d="M31.6 54.6C32.4 56.6 32.8 58 31.6 58.6C30.4 58.6 30.2 57 30.8 54.8Z"
		/>
		<path class="sand line" d={POND} />
		<path
			class="soil thin-line"
			d="M24 85C28 79 60 78 80 78C102 78 132 79 136 85C138 91 108 94 80 94C52 94 20 91 24 85Z"
		/>
		<path
			class="open thin-line"
			d="M44 86L52 84L56 88M100 90L106 86L114 88M70 92L76 89L82 91M118 83L124 85"
		/>
		<g transform="translate(36 88) rotate(-25)">
			<path class="n line" d="M5 0C8 -3 10 -4 12 -3C11 -1 11 1 12 3C10 4 8 3 5 0Z" />
			<path class="g line" d="M-7 0C-7 -4 -2 -6 2 -5C5 -4 7 -2 7 0C7 2 5 4 2 5C-2 6 -7 4 -7 0Z" />
			{@render eye(-3.4, -1.2, 1.6, -0.3, 0)}
			<path class="open thin-line" d="M-6.8 1.4Q-5.5 2.4 -4.2 1.8" />
		</g>
		<ellipse class="shade" cx="84" cy="90" rx="38" ry="4" />
		{@render member('stego-hind-far', STEGO_HIND_FAR, 'n', true)}
		{@render member('stego-front-far', STEGO_FRONT_FAR, 'n', true)}
		{#each STEGO_PLATES as p (p.x)}
			<path
				class="a line"
				transform="translate({p.x + 3} {p.y - 1}) rotate({p.tilt})"
				d={platePath(p.height)}
			/>
			<path
				class="shade"
				transform="translate({p.x + 3} {p.y - 1}) rotate({p.tilt})"
				d={platePath(p.height)}
			/>
		{/each}
		{#each STEGO_PLATES as p (p.x)}
			<path
				class="a line"
				transform="translate({p.x} {p.y}) rotate({p.tilt})"
				d={platePath(p.height)}
			/>
		{/each}
		{#each STEGO_SPIKES as spike, i (spike)}
			{@render form(`stego-spike-${i}`, spike, 'sand')}
		{/each}
		{#snippet stegoInside()}
			<path class="sand" d="M20 58C40 66 70 74 104 66C112 64 120 64 136 64L140 100L20 100Z" />
			<path class="light" d="M60 46C70 38 88 35 100 41C90 38 72 40 62 48Z" />
			<path class="light" d="M124 56C128 54 132 54 134 56C131 55.5 128 56 125 57.5Z" />
			<path class="open light-stroke" d="M70 50Q76 47 82 48M92 46Q96 46 100 48" />
		{/snippet}
		{@render form('stego-body', STEGO_BODY, 'n', { inside: stegoInside, bold: true })}
		{@render member('stego-hind', STEGO_HIND, 'n')}
		{@render nails(STEGO_HIND, 0.85)}
		{@render member('stego-front', STEGO_FRONT, 'n')}
		{@render nails(STEGO_FRONT, 0.8)}
		{@render eye(129, 58.6, 2.4, 0.6, 0.6)}
		<path class="n line" d="M126.4 58.2C126.6 55.4 131.4 55.4 131.6 58.2Z" />
		<path class="open line" d="M126 54.6Q129 53.6 132 55" />
		<path class="open line" d="M137 63.4C134 64.6 130 64.4 127.6 63.6" />
		<path
			class="water thin-line"
			d="M131 65.6C131.6 67.6 132 69 130.8 69.6C129.6 69.6 129.4 68 130 65.8Z"
		/>
		<path class="water thin-line" d="M82 74.6C82.6 77 83 78.4 81.8 79C80.6 79 80.4 77.4 81 74.8Z" />
		<path
			class="water thin-line"
			d="M66 71.2C66.6 73.4 67 75 65.8 75.4C64.6 75.4 64.4 74 65 71.4Z"
		/>
		<g transform="translate(131 52.4) rotate(8)">
			<path
				class="e line"
				d="M-7 0C-7 -2.4 -3 -3.4 0 -3.4C4 -3.4 7 -2.4 7 0C7 1.6 3 2.4 0 2.4C-1 2.4 -1.6 1.2 -1 0.2L-3 2C-5 1.8 -7 1.2 -7 0Z"
			/>
			<path class="o line" d="M-3 -2C-4 -6 -1 -8 1 -8C3.6 -8 5 -6 4 -2C2 -1 -1 -1 -3 -2Z" />
			<circle class="o line" cx="-0.6" cy="-8.4" r="1.6" />
			<circle class="o line" cx="2.6" cy="-8.4" r="1.6" />
			<circle class="dark" cx="-0.6" cy="-8.4" r="0.6" />
			<circle class="dark" cx="2.6" cy="-8.4" r="0.6" />
			<path class="open thin-line" d="M-0.6 -5.4Q1 -4.8 2.6 -5.4" />
		</g>
	</g>
{:else if art === 'dino-raptor'}
	<g data-story-art="dino-raptor">
		{@render sky('stop-paper')}
		{@render volcano(140, 64, 0.8)}
		{@render hills(58)}
		<path class="grass line" d="M-4 82C30 78 70 78 100 80C130 82 146 80 164 79L164 104L-4 104Z" />
		{@render fern(150, 82, 1)}
		{#snippet rockInside()}
			<path class="light" d="M10 50C18 40 34 34 48 36C34 38 20 44 14 54Z" />
		{/snippet}
		{@render form('rock', 'M4 90C0 70 4 52 18 42C32 32 54 32 66 44C76 54 78 74 76 90Z', 'rock', {
			inside: rockInside
		})}
		<text class="word" x="36" y="74" text-anchor="middle" transform="rotate(-4 36 74)"
			>{m.story_art_miam()}</text
		>
		{@render tuft(6, 92, 1.2)}
		{@render tuft(78, 91, 1)}
		<ellipse class="shade" cx="118" cy="90" rx="20" ry="3" />
		{@render member('raptor-leg-far', RAPTOR_LEG_FAR, 'i', true)}
		<path
			class="g line"
			d="M98 27C100 22 104 19 108 19C106 21 105 23 106 25C108 23 111 22 114 23C111 25 108 28 104 31Z"
		/>
		<path class="g line" d="M150 37C153 32 158 29 164 29L164 40C158 41 154 41 151 42Z" />
		<path class="f line" d="M82 37C81 41 82 44 85 44C87 44 88 42 87 38Z" />
		{#snippet raptorInside()}
			<path
				class="sky"
				d="M68 36C78 40 88 41 94 46C98 52 100 58 106 62C114 64 124 60 136 54L140 100L60 100Z"
			/>
			<path
				class="night"
				d="M116.4 46C120 49 120.8 54 118.4 58.4C116.4 54.6 115.2 50 116.4 46ZM127 43.4C130.4 46.4 131 50.6 128.8 54.6C127 51 126 47 127 43.4ZM137.4 40.2C140.4 42.8 141 46.4 139.2 49.8C137.6 46.8 136.6 43.4 137.4 40.2Z"
			/>
			<path class="light" d="M76 28C82 25 90 24 96 25C90 25.5 82 27 77 30Z" />
		{/snippet}
		{@render form('raptor-body', RAPTOR_BODY, 'i', { inside: raptorInside, bold: true })}
		<path
			class="white line"
			d="M116.6 85.6C115.6 82 113 80.2 110.4 80.6C112.4 81.8 113.6 83.8 114 86.2Z"
		/>
		<path class="white thin-line" d="M108.6 86.8C106.8 86.8 106 88 106.4 89.2L108.8 89.2Z" />
		{@render member('raptor-leg', RAPTOR_LEG, 'i')}
		<path class="white thin-line" d="M108.4 88.6C106.6 88.8 106 90 106.6 91L108.8 90.6Z" />
		{@render member('raptor-toe', RAPTOR_TOE, 'i')}
		<path class="open line" d="M71 33C76 35 82 35.4 88 35C90 34.8 91 34 91 33" />
		<circle class="dark" cx="73.4" cy="30" r="0.6" />
		{@render eye(94, 30, 2.6, -1, 0.8)}
		<path class="open line" d="M90.6 26.4Q94 25 97.6 26.6" />
		<g transform="translate({PENCIL.x} {PENCIL.y}) rotate({PENCIL.angle})">
			<path
				class="f line"
				d="M27 -2.2L29 -2.2C30 -2.2 30.5 -1.5 30.5 0C30.5 1.5 30 2.2 29 2.2L27 2.2Z"
			/>
			<path class="metal line" d="M24.5 -2.2L27 -2.2L27 2.2L24.5 2.2Z" />
			<path class="c line" d="M6 -2.2L24.5 -2.2L24.5 2.2L6 2.2Z" />
			<path class="open thin-line" d="M6 0L24.5 0" />
			<path class="sand line" d="M0 0L6 -2.2L6 2.2Z" />
			<path class="dark" d="M0 0L2 -0.75L2 0.75Z" />
		</g>
		<path
			class="g line"
			d="M102 60C100 64 96 66 92 65C94.6 66.6 97.6 66.6 99.6 65.6C98.4 67.4 96 68.4 94 68.4C98 69.4 102 67 103.6 62Z"
		/>
		{@render member('raptor-arm', RAPTOR_ARM, 'i')}
		{#each RAPTOR_FINGERS as finger, i (i)}
			{@render member(`raptor-finger-${i}`, finger, 'i')}
		{/each}
	</g>
{:else if art === 'dino-trex'}
	<g data-story-art="dino-trex">
		{@render sky('stop-paper')}
		{@render volcano(146, 64, 0.75)}
		{@render hills(60)}
		<path class="grass line" d="M-4 84C30 80 70 80 100 82C130 84 146 82 164 81L164 104L-4 104Z" />
		{@render fern(10, 90, 0.8)}
		{@render tuft(70, 88, 1.1)}
		<path
			class="open line"
			d="M31 41C27.4 46 27.4 53 31 58M24 36C18.6 43.6 18.6 55.4 24 63M17 31C9.6 41 9.6 58 17 68"
		/>
		<g transform="translate(106 11) rotate(26) scale(0.9)">
			<path class="b line" d="M6 1C12 -0.5 18 0.5 19 4C14 5.5 9 4.5 5 3Z" />
			<path class="b line" d="M-8 2C-9 -6 -4 -9.5 0 -9.5C5 -9.5 9 -6 8 2C3 3.4 -3 3.4 -8 2Z" />
			<path class="open thin-line" d="M0 -9.5C-1 -6 -1 -2 0 2.6M-6 -6C-4 -3 -4 0 -4 2.6" />
			<circle class="b line" cx="0" cy="-9.5" r="1.4" />
			<path
				class="c thin-line"
				d="M2.6 -4.6L3.5 -2.6L5.6 -2.4L4 -1L4.4 1L2.6 0L0.8 1L1.2 -1L-0.4 -2.4L1.7 -2.6Z"
			/>
		</g>
		<path class="open thin-line" d="M90 13C92 10 95 8.4 98 8M93 18C96 15.6 99 15 102 15.6" />
		<path class="open thin-line" d="M80 11.6L79.4 8.6M86 12.4L87.6 9.8M74 13.6L72.4 11.4" />
		<ellipse class="shade" cx="110" cy="91" rx="24" ry="3.4" />
		{@render member('trex-leg-far', TREX_LEG_FAR, 'a', true)}
		<path class="white thin-line" d="M113.6 86.4C111.6 86.6 110.6 88.2 111.4 89.8L114 89.4Z" />
		{#snippet trexInside()}
			<path class="c" d={TREX_BELLY} />
			{#each TREX_SCALES as scale (scale.x)}
				<path
					class="open thin-line"
					transform="translate({scale.x} {scale.y}) rotate({scale.tilt})"
					d="M0 -2.6Q1 0 0 2.6"
				/>
			{/each}
			{#each TREX_STRIPES as stripe (stripe.x)}
				<path
					class="j"
					transform="translate({stripe.x} {stripe.y}) rotate({stripe.tilt})"
					d={stripePath(stripe.length)}
				/>
			{/each}
			<path class="light" d="M90 29.6C98 29.6 106 33.6 114 37.4C106 35.6 98 32.4 90 32Z" />
		{/snippet}
		{@render form('trex-body', TREX_BODY, 'a', { inside: trexInside, bold: true })}
		{@render member('trex-arm', TREX_ARM, 'a')}
		{#each TREX_FINGERS as finger, i (i)}
			{@render member(`trex-finger-${i}`, finger, 'a')}
		{/each}
		{#snippet mouthInside()}
			<ellipse class="j" cx="75" cy="47.2" rx="9" ry="5.8" transform="rotate(-22 75 47.2)" />
			<path class="shade" d="M30 34C50 36 66 39 86 43L86 47.6C68 43 52 40.6 30 40Z" />
			<path class="a thin-line" d={TREX_TONGUE} />
			<path class="open thin-line" d="M60 55.8C67 54.2 74 52 80.6 49.8" />
			<path class="light" d="M56 53.4C61 52.6 66 52 70 51.2C66 52.8 61 53.8 56.6 54.6Z" />
		{/snippet}
		{@render form('trex-mouth', TREX_MOUTH, 'f', { inside: mouthInside })}
		<path
			class="f thin-line"
			d="M74.6 43.4C74.4 45.6 74.6 47.6 75.8 48.4C77 47.6 77.2 45.6 77 44Z"
		/>
		<path class="white thin-line" d={TREX_UPPER_TEETH} />
		<path class="white thin-line" d={TREX_LOWER_TEETH} />
		{#snippet jawInside()}
			<path class="c" d="M46 67C60 66.4 76 61 91 53L93 76L44 76Z" />
			<path class="light" d="M55 62.6C62 60.6 69 57.4 76 53.2C70 57.8 62 61.4 56 64Z" />
		{/snippet}
		{@render form('trex-jaw', TREX_JAW, 'a', { inside: jawInside, bold: true })}
		{#snippet skullInside()}
			<path class="light" d="M40 27.6C48 25 56 23 63 21C56 24 48 26.4 41 29.4Z" />
			<path class="j" transform="translate(91 19.4) rotate(48)" d={stripePath(6)} />
			<path class="j" transform="translate(94.6 25.6) rotate(70)" d={stripePath(5)} />
		{/snippet}
		{@render form('trex-skull', TREX_SKULL, 'a', { inside: skullInside, bold: true })}
		<ellipse class="dark" cx="39.6" cy="29" rx="1.3" ry="0.9" transform="rotate(-14 39.6 29)" />
		<path class="open thin-line" d="M88.6 32C90.4 35 90.4 39 88.6 42" />
		{@render eye(80.2, 24.8, 3.6, -1.1, 0.2)}
		<path class="a line" d={TREX_BROW} />
		<path class="white thin-line" d="M93.6 87.2C91.4 87.4 90.4 89 91.2 90.8L94 90.4Z" />
		{@render member('trex-leg', TREX_LEG, 'a')}
		<path class="white thin-line" d="M96.6 88.6C94.6 88.8 93.8 90.4 94.6 91.6L97 91.2Z" />
		{@render member('trex-toe', TREX_TOE, 'a')}
	</g>
{:else if art === 'dino-ending'}
	<g data-story-art="dino-ending">
		{@render sky('stop-sand')}
		<circle class="spark line" cx="126" cy="26" r="10" />
		<circle class="light" cx="123" cy="23" r="3.2" />
		{@render volcano(52, 60, 0.9)}
		{@render hills(56)}
		<path class="grass line" d="M-4 74C30 70 70 70 100 72C130 74 146 72 164 71L164 104L-4 104Z" />
		{@render fern(106, 72, 0.9)}
		<g>
			<path
				class="wood line"
				d="M146.4 74C146 66 146.4 58 146 50L149.6 50C149.2 58 149.6 66 150.2 74Z"
			/>
			<path
				class="wood line"
				d="M136 51C142 50 150 50 156 51L160 55L156 59C150 60 142 60 136 59C135 56.4 135 53.6 136 51Z"
			/>
			<circle class="dark" cx="145" cy="55" r="2.6" />
			<path class="dark" d="M147 54.2L153.6 53.4C154.4 53.4 154.6 54.8 153.8 55L147.2 55.8Z" />
		</g>
		<ellipse class="shade" cx={ENDING_DINO.x + 37} cy="87" rx="23" ry="3.4" />
		{#snippet slabInside()}
			<path class="light" d="M52 73C80 70 120 70 154 72L154 74.4L52 75.6Z" />
		{/snippet}
		{@render form(
			'slab',
			'M48 76C52 71 100 69 150 71C156 71 160 74 160 79L158 98C120 101 80 101 50 98C47 90 46 82 48 76Z',
			'rock',
			{ inside: slabInside }
		)}
		<path
			class="a line"
			d="M58 74C78 71 98 71 106 73C114 71 134 71 154 74L158 93C136 90.6 116 90.6 106 94C96 90.6 76 90.6 54 93Z"
		/>
		<path
			class="paper line"
			d="M60 74.8C78 72.2 96 72.2 106 74.4L106 92.6C96 89.6 76 89.6 56.4 91.8Z"
		/>
		<path
			class="paper line"
			d="M152 74.8C134 72.2 116 72.2 106 74.4L106 92.6C116 89.6 136 89.6 155.6 91.8Z"
		/>
		<path
			class="shade"
			d="M106 74.4C104 73.8 102 73.6 100.6 73.6L100.6 90.6C102.6 91 104.4 91.6 106 92.6Z"
		/>
		<path
			class="shade"
			d="M106 74.4C105 74 104 73.9 103.4 73.9L103.4 91.2C104.4 91.6 105.2 92 106 92.6Z"
		/>
		<path
			class="shade"
			d="M106 74.4C108 73.8 110 73.6 111.4 73.6L111.4 90.6C109.4 91 107.6 91.6 106 92.6Z"
		/>
		<path
			class="shade"
			d="M106 74.4C107 74 108 73.9 108.6 73.9L108.6 91.2C107.6 91.6 106.8 92 106 92.6Z"
		/>
		<path class="open dash-line" d="M70 77L90 76L91 88L69.6 88.8Z" />
		<path
			class="shell thin-line"
			d="M94.6 84.6C94.6 80.6 96.6 78.4 98.6 78.4C100.6 78.4 102.6 80.6 102.6 84.6C100.6 86 96.6 86 94.6 84.6Z"
		/>
		<path class="open thin-line" d="M94.8 82.6L96.6 81.4L98.2 82.8L100 81.2L102 82.4" />
		<path
			class="open thin-line"
			d="M62 85.6Q64 84.6 66 85.6T70 85.6M60.6 88.6Q63 87.6 65.4 88.6T70.2 88.6"
		/>
		<path
			class="open thin-line"
			d="M112 78.6Q115 77.6 118 78.6T124 78.6T130 78.6M112 81.6Q115 80.6 118 81.6T124 81.6T130 81.6M112 84.6Q115 83.6 118 84.6T124 84.6"
		/>
		<path class="leaf thin-line" d="M134 82C136 77.6 141 76.4 146 77.6C143.6 81 139 83 134 82Z" />
		<path class="open thin-line" d="M135 81.6C138 80 141 79 144.6 78.2" />
		<g class="dark">
			<ellipse cx="120" cy="88.4" rx="2" ry="1.4" />
			<circle cx="117.6" cy="86.4" r="0.7" />
			<circle cx="120" cy="85.8" r="0.7" />
			<circle cx="122.4" cy="86.4" r="0.7" />
		</g>
		<path
			class="b thin-line"
			d="M129 88C129 85.6 130.8 84.4 133 84.4C135.2 84.4 136.8 85.6 136.8 88C138.6 88 139.8 88.4 140.2 89.2C136 89.8 131.4 89.6 129 88Z"
		/>
		<path
			class="star thin-line"
			d="M147 82.4L148.2 85L151 85.3L148.9 87.2L149.5 90L147 88.6L144.5 90L145.1 87.2L143 85.3L145.8 85Z"
		/>
		<g transform="translate(36 95) rotate(6)">
			<path
				class="b line"
				d="M-10 -2.4L4 -2.4L4 2.4L-10 2.4C-11 2.4 -11.5 1.4 -11.5 0C-11.5 -1.4 -11 -2.4 -10 -2.4Z"
			/>
			<path class="white line" d="M4 -2L9 -2C10 -2 10.5 -1 10.5 0C10.5 1 10 2 9 2L4 2Z" />
		</g>
		<StoryDino x={ENDING_DINO.x} y={ENDING_DINO.y} size={ENDING_DINO.size} flip />
		<g transform="translate({ENDING_HAND[0]} {ENDING_HAND[1]}) rotate(10) translate(-1.5 -3)">
			<path class="white line" d="M0 0L21 0L21 18L0 18Z" />
			<path class="sky" d="M2 2L19 2L19 13L2 13Z" />
			<path class="grass" d="M2 10C7 9.2 14 9.2 19 10L19 13L2 13Z" />
			<path
				class="g thin-line"
				d="M3.6 11.4C3.6 8.6 5.4 7.6 8 7.6C9.8 7.6 10.8 6.6 11.6 3.8C12.2 2.8 13.4 2.8 13.8 3.8C12.6 5.6 11.8 8.6 11.2 11Z"
			/>
			<path
				class="a thin-line"
				d="M14 11.4C13.8 9 15 7.4 17 7.2L19 7.4L19 9L17 9.6L19 10.2L19 11.4Z"
			/>
			<path class="open thin-line" d="M2 2L19 2L19 13L2 13Z" />
		</g>
	</g>
{/if}

<style>
	.line,
	.thin-line,
	.bold-line,
	.ripple,
	.wood-dark,
	.wood-stroke,
	.soil-stroke,
	.metal-stroke,
	.light-stroke {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line,
	.thin-line,
	.bold-line {
		stroke: var(--dd-color-story-line);
	}

	.line {
		stroke-width: var(--dd-border-width-thick);
	}

	.thin-line {
		stroke-width: var(--dd-border-width-thin);
	}

	.bold,
	.bold-line {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.open {
		fill: transparent;
	}

	.ripple {
		fill: transparent;
		stroke: var(--dd-color-story-white);
		stroke-width: var(--dd-border-width-thick);
	}

	.wood-dark {
		stroke: var(--dd-color-story-p);
		stroke-width: var(--dd-border-width-thin);
	}

	.wood-stroke {
		stroke: var(--dd-color-story-wood);
		stroke-width: var(--dd-border-width-thick);
	}

	.soil-stroke {
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thick);
	}

	.metal-stroke {
		stroke: var(--dd-color-story-metal);
		stroke-width: var(--dd-border-width-target);
	}

	.light-stroke {
		stroke: var(--dd-color-story-light);
		stroke-opacity: var(--dd-opacity-story-light);
		stroke-width: var(--dd-border-width-thick);
	}

	.shade {
		fill: var(--dd-color-story-shade);
		fill-opacity: var(--dd-opacity-story-shade);
	}

	.light {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.haze {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-glass);
	}

	.dash-line {
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thin);
		stroke-dasharray: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.frill-stroke {
		stroke: var(--dd-color-story-h);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.j {
		fill: var(--dd-color-story-j);
	}

	.stop-sky {
		stop-color: var(--dd-color-story-sky);
	}

	.stop-paper {
		stop-color: var(--dd-color-story-paper);
	}

	.stop-sand {
		stop-color: var(--dd-color-story-sand);
	}

	.stop-water {
		stop-color: var(--dd-color-story-water);
	}

	.stop-water-deep {
		stop-color: var(--dd-color-story-water-deep);
	}

	.sky {
		fill: var(--dd-color-story-sky);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.grass {
		fill: var(--dd-color-story-grass);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.sand {
		fill: var(--dd-color-story-sand);
	}

	.rock {
		fill: var(--dd-color-story-rock);
	}

	.soil {
		fill: var(--dd-color-story-soil);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.paper {
		fill: var(--dd-color-story-paper);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.spark {
		fill: var(--dd-color-story-spark);
	}

	.shell {
		fill: var(--dd-color-egg-shell);
	}

	.egg-spot {
		fill: var(--dd-color-egg-spot);
	}

	.baby-a {
		fill: var(--dd-color-baby-a);
	}

	.baby-b {
		fill: var(--dd-color-baby-b);
	}

	.baby-c {
		fill: var(--dd-color-baby-c);
	}

	.a {
		fill: var(--dd-color-story-a);
	}

	.b {
		fill: var(--dd-color-story-b);
	}

	.c {
		fill: var(--dd-color-story-c);
	}

	.d {
		fill: var(--dd-color-story-d);
	}

	.e {
		fill: var(--dd-color-story-e);
	}

	.f {
		fill: var(--dd-color-story-f);
	}

	.g {
		fill: var(--dd-color-story-g);
	}

	.h {
		fill: var(--dd-color-story-h);
	}

	.i {
		fill: var(--dd-color-story-i);
	}

	.l {
		fill: var(--dd-color-story-l);
	}

	.m {
		fill: var(--dd-color-story-m);
	}

	.n {
		fill: var(--dd-color-story-n);
	}

	.o {
		fill: var(--dd-color-story-o);
	}

	.p {
		fill: var(--dd-color-story-p);
	}

	.word {
		fill: var(--dd-color-story-ink);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
