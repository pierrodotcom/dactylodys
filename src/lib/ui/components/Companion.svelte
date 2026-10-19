<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { companionAppearance } from '$lib/ui/companion/appearance';
	import CompanionItem from '$lib/ui/companion/CompanionItem.svelte';
	import {
		capsulePath,
		crescentPath,
		ovalPath,
		ovalPoint,
		roundedStarPath
	} from '$lib/ui/companion/geometry';
	import {
		ARM_POSES,
		ITEM_ARTS,
		TRICK_ARMS,
		wornBySlot,
		type ArmPose,
		type Point
	} from '$lib/ui/companion/items';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';
	type Side = 'left' | 'right';

	interface Props {
		mood: Mood;
		/** Which dance it does when it cheers: they follow one another (ADR-032). */
		dance?: number;
		/** Overrides the colour given by the route (`provideCompanionAppearance`); `null`: its own colour. */
		colorId?: string | null;
		/** Overrides the worn items given by the route: `RewardDefinition.artId`, one per slot. */
		itemArtIds?: readonly string[];
		/** A learned trick (skill `artId`) played once; re-key the component to play it again. */
		trick?: string | null;
	}

	interface Face {
		/** Where the pupils look, from the middle of the eye. */
		look: Point;
		/** How far down the upper lid comes from the middle of the eye; `null`: no lid. */
		lid: number | null;
		/** A lower lid pushed up by the cheeks (smiling eyes). */
		smilingEyes: boolean;
		/** The left brow, outer end then inner end, and how much it arches (negative: up). */
		brow: { outer: Point; inner: Point; bend: number };
		blush: boolean;
	}

	interface Arm {
		fill: string;
		outer: string;
		inner: string;
		/** Places the hand, drawn with its fingers along +y, at the grip. */
		hand: string;
	}

	const LABELS: Readonly<Record<Mood, () => string>> = {
		idle: m.ui_companion_idle,
		happy: m.ui_companion_happy,
		oops: m.ui_companion_oops,
		cheer: m.ui_companion_cheer
	};
	const SPARKLE_PATH = 'M16 22L18.5 28L25 30.5L18.5 33L16 39L13.5 33L7 30.5L13.5 28Z';

	/** Number of different dances; the first one is the hop of every cheer. */
	const DANCES = 5;

	/** Three tomatoes on a circle around (60, 40) that goes through both raised hands. */
	const ORBIT = { x: 60, y: 40, r: 36 } as const;
	const TOMATOES = [-90, -30, -150].map((deg) => {
		const [x, y] = ovalPoint(ORBIT.x, ORBIT.y, ORBIT.r, ORBIT.r, deg);
		const p = (dx: number, dy: number) => `${round(x + dx)} ${round(y + dy)}`;
		return {
			x,
			body:
				`M${p(0, -5.6)}C${p(3.8, -7.6)} ${p(8, -5.6)} ${p(8.4, -1)}C${p(8.8, 3.8)} ${p(5.2, 8)} ${p(0, 8)}` +
				`C${p(-5.2, 8)} ${p(-8.8, 3.8)} ${p(-8.4, -1)}C${p(-8, -5.6)} ${p(-3.8, -7.6)} ${p(0, -5.6)}Z`,
			ribs: `M${p(-2.2, -5.4)}C${p(-3.2, -4.2)} ${p(-3.6, -2.8)} ${p(-3.6, -1.4)}M${p(2.2, -5.4)}C${p(3.2, -4.2)} ${p(3.6, -2.8)} ${p(3.6, -1.4)}`,
			gloss:
				ovalPath(round(x - 3.8), round(y - 2), 1.5, 2.1) +
				ovalPath(round(x - 1.4), round(y - 4.6), 0.7, 0.5),
			calyx: roundedStarPath(x, round(y - 5.8), 4.6, 1.3, 5, 0.3),
			stem: capsulePath(x, round(y - 6.4), round(x + 1), round(y - 9.6), 0.75),
			/* Behind each tomato on the orbit, which turns clockwise. */
			trail:
				crescentPath(ORBIT.x, ORBIT.y, ORBIT.r, deg - 54, deg - 13, 2.6) +
				crescentPath(ORBIT.x, ORBIT.y, ORBIT.r - 5, deg - 40, deg - 16, 0.9) +
				crescentPath(ORBIT.x, ORBIT.y, ORBIT.r + 5, deg - 34, deg - 15, 0.9)
		};
	});

	/** The roar: waves on both sides of the open mouth, curling at their ends. */
	const ROAR_WAVES = [
		{ r: 36, span: 19, thickness: 2.6 },
		{ r: 42.6, span: 23, thickness: 2.2 },
		{ r: 49.2, span: 26, thickness: 1.8 }
	];
	const ROAR_WAVE_LEFT = ROAR_WAVES.map((w) =>
		crescentPath(60, 64, w.r, 180 - w.span, 180 + w.span, w.thickness)
	).join('');
	const ROAR_CURLS_LEFT =
		'M15.4 42.4C12.6 40.6 12.8 36.8 15.6 36C17.8 35.4 19.4 37.6 18 39.2M15.4 85.6C12.6 87.4 12.8 91.2 15.6 92C17.8 92.6 19.4 90.4 18 88.8';

	/** The wheel: a long stroke on each side, an arrow at its front, turning clockwise. */
	function wheelStroke(from: number, to: number): string {
		const stroke = crescentPath(60, 60, 54, from, to, 2.6);
		const [x, y] = ovalPoint(60, 60, 54, 54, to + 2);
		const angle = ((to + 2) * Math.PI) / 180;
		const tangent = [-Math.sin(angle), Math.cos(angle)] as const;
		const radial = [Math.cos(angle), Math.sin(angle)] as const;
		const p = (along: number, out: number) =>
			`${round(x + tangent[0] * along + radial[0] * out)} ${round(y + tangent[1] * along + radial[1] * out)}`;
		return `${stroke}M${p(5.6, 0)}Q${p(1, 1.4)} ${p(-1.2, 4.2)}Q${p(-0.2, 0)} ${p(-1.2, -4.2)}Q${p(1, -1.4)} ${p(5.6, 0)}Z`;
	}
	const WHEEL_STROKES =
		wheelStroke(196, 254) +
		wheelStroke(16, 74) +
		crescentPath(60, 60, 47.6, 206, 244, 0.9) +
		crescentPath(60, 60, 47.6, 26, 64, 0.9);

	/** Floating: a soft shadow far below, sparkles around, lines under the feet that follow them. */
	const FLOAT_SPARKLES =
		roundedStarPath(14.6, 38, 4.6, 1.3, 4, 0.2) +
		roundedStarPath(104.6, 26.4, 3.8, 1.1, 4, 0.2) +
		roundedStarPath(103.4, 80.6, 3, 0.9, 4, 0.2) +
		roundedStarPath(18.4, 88.6, 2.4, 0.8, 4, 0.2);
	const FLOAT_LIFT = [44, 60, 76]
		.map((x, i) => capsulePath(x, 118 + (i % 2) * 1.6, x, 123.4 + (i % 2) * 1.6, 0.7))
		.join('');
	/** Upside down, the feet wobble: marks beside them, drawn the right way up. */
	const HANDSTAND_WOBBLE =
		crescentPath(44, 107, 16, 160, 200, 0.9) +
		crescentPath(44, 107, 20.4, 164, 196, 0.7) +
		crescentPath(76, 107, 16, -20, 20, 0.9) +
		crescentPath(76, 107, 20.4, -16, 16, 0.7);
	const GROUND_SHADOW = ovalPath(60, 115.6, 30, 3.4);
	const SOFT_SHADOW = ovalPath(60, 116.4, 26, 3.6) + ovalPath(60, 116.4, 15, 2.2);

	/** The middle of the view box: the right side of the dino is its left side mirrored. */
	const MIDDLE = 60;
	/** Larger than the view box: a shade is this frame with the form cut out, moved up and left. */
	const FRAME = 'M-60 -60L180 -60L180 180L-60 180Z';
	const EYES: Readonly<Record<Side, Point>> = { left: { x: 48, y: 46 }, right: { x: 72, y: 46 } };
	const SIDES: readonly Side[] = ['left', 'right'];

	function round(value: number): number {
		return Math.round(value * 100) / 100;
	}

	/** The same path seen in a mirror at the middle: every path here is written in x y pairs. */
	function mirror(d: string): string {
		return d.replace(
			/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
			(_, x: string, y: string) => `${round(2 * MIDDLE - Number(x))} ${y}`
		);
	}

	function both(d: string): Record<Side, string> {
		return { left: d, right: mirror(d) };
	}

	/** An oval drawn with four curves, so that it is a path like every other form. */
	function oval(cx: number, cy: number, rx: number, ry: number): string {
		const k = 0.5523;
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		return (
			`M${p(cx, cy - ry)}C${p(cx + rx * k, cy - ry)} ${p(cx + rx, cy - ry * k)} ${p(cx + rx, cy)}` +
			`C${p(cx + rx, cy + ry * k)} ${p(cx + rx * k, cy + ry)} ${p(cx, cy + ry)}` +
			`C${p(cx - rx * k, cy + ry)} ${p(cx - rx, cy + ry * k)} ${p(cx - rx, cy)}` +
			`C${p(cx - rx, cy - ry * k)} ${p(cx - rx * k, cy - ry)} ${p(cx, cy - ry)}Z`
		);
	}

	/** A brow thick in its middle and thin at both ends. */
	function browPath(from: Point, to: Point, bend: number): string {
		const half = 1.5;
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.hypot(dx, dy);
		const nx = -dy / length;
		const ny = dx / length;
		const mx = (from.x + to.x) / 2 + nx * bend;
		const my = (from.y + to.y) / 2 + ny * bend;
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		return (
			`M${p(from.x, from.y)}Q${p(mx + nx * half * 2, my + ny * half * 2)} ${p(to.x, to.y)}` +
			`Q${p(mx - nx * half * 2, my - ny * half * 2)} ${p(from.x, from.y)}Z`
		);
	}

	/** A dorsal plate standing on (x, y), turned by `angle` degrees, its rounded tip `h` away. */
	function platePath(h: number, w: number): string {
		return `M${-w} 1C${-w} ${round(-h * 0.5)} ${round(-w * 0.62)} ${round(-h * 0.94)} 0 ${-h}C${round(w * 0.62)} ${round(-h * 0.94)} ${w} ${round(-h * 0.5)} ${w} 1Z`;
	}

	const HEAD =
		'M60 19C75.5 19 87 28.5 88.6 41.5C89.6 49.5 91 56 89 62.5C86.4 70.5 76 76 60 76C44 76 33.6 70.5 31 62.5C29 56 30.4 49.5 31.4 41.5C33 28.5 44.5 19 60 19Z';
	const HEAD_LIGHT =
		'M37.6 34C39 27.6 44.4 23.2 50.6 22.2C46.6 25.4 43.2 29.6 41.2 35C40.4 37 37.2 36.2 37.6 34Z';
	const SNOUT_RIDGE = 'M45.5 58.6C48.6 53.6 54 51.2 60 51.2C66 51.2 71.4 53.6 74.5 58.6';
	const SNOUT_LIGHT = 'M52.6 53.8C55.4 52.6 64.6 52.6 67.4 53.8C64.6 55 55.4 55 52.6 53.8Z';
	const NOSTRILS = both(
		'M55.4 55.2C54.4 55.6 53.6 56.8 54.1 57.7C54.7 58.5 56.4 57.9 56.9 56.8C57.2 55.9 56.4 54.9 55.4 55.2Z'
	);
	const CHEEKS = both(oval(38.4, 61, 4.6, 3.2));

	const BODY =
		'M60 54C76 54 86.5 62 90.5 74C94.5 86 96.5 97 91.5 104C86.5 110 74 110.5 60 110.5C46 110.5 33.5 110 28.5 104C23.5 97 25.5 86 29.5 74C33.5 62 44 54 60 54Z';
	const BODY_LIGHT =
		'M30.6 86C31.6 80 33.8 75.6 36.4 72.6C35.6 77 35.2 82 35.4 87.4C35.4 89.6 30.4 89.4 30.6 86Z';
	/** The shade of the chin on the chest. */
	const CHIN_SHADE = 'M38 70C44 80 76 80 82 70C78 84.5 42 84.5 38 70Z';
	const NECK = both('M42.6 72.6C42.4 75.6 41.4 78.4 39.4 80.6');
	const BELLY =
		'M60 69C70.5 69 78 77.5 79 88C80 98.5 72.5 106 60 106C47.5 106 40 98.5 41 88C42 77.5 49.5 69 60 69Z';
	const BELLY_BANDS =
		'M36 80Q60 87 84 80M36 87.5Q60 94.5 84 87.5M36 95Q60 101.5 84 95M36 102Q60 107.5 84 102';

	const THIGH = both(
		'M48 87C40.5 84.5 31.5 86 28 93C25 99.5 27.5 105 33 107L52.5 107C54 101 52.5 92 48 87Z'
	);
	const THIGH_LINE = both('M41.4 85.6C34.6 86 30 89 28 93C25 99.5 27.5 105 33 107');
	const THIGH_CREASE = both('M52.8 103.6C53 99.6 52 95.6 50 92.6');
	const THIGH_LIGHT = both(
		'M32.6 92.4C34.6 89.2 38.6 87.6 42.6 87.6C39.2 89.2 36.4 91.4 34.6 94.2C33.8 95.4 32 94 32.6 92.4Z'
	);
	const FOOT = both(
		'M32.6 106.5C32 101.5 37 100 44 100C51 100 56 101.5 55.4 106.5C55.8 110.4 54.4 113 51.6 113.2C50.2 113.4 48.6 113 47.8 112.2C46.6 113.6 42.2 113.8 40.6 112.4C39.6 113.2 38 113.4 36.8 113.2C33.8 112.8 32.2 110.2 32.6 106.5Z'
	);
	const TOES = both(
		'M47.8 112.2C47.9 111 47.7 110 47.2 109M40.6 112.4C40.4 111.2 40.6 110.2 41 109.2'
	);
	const CLAWS = both(
		[
			{ x: 36.6, y: 112.4 },
			{ x: 44.2, y: 112.8 },
			{ x: 51.6, y: 112.4 }
		]
			.map(
				({ x, y }) =>
					`M${x - 1.6} ${y}C${x - 1.6} ${y - 1.4} ${x - 0.8} ${y - 2} ${x} ${y - 2}C${round(x + 0.8)} ${y - 2} ${round(x + 1.6)} ${y - 1.4} ${round(x + 1.6)} ${y}C${round(x + 0.6)} ${round(y + 0.6)} ${round(x - 0.6)} ${round(y + 0.6)} ${round(x - 1.6)} ${y}Z`
			)
			.join('')
	);

	const TAIL =
		'M84 100C95 103 105 99.5 109.5 90C112.6 83.4 112.6 75 109.6 68.6C108.8 67 106.8 67.4 106.8 69.2C107 76.4 104.6 83 99 86.4C94.6 89 89.4 89.4 85 88Z';
	const TAIL_LINE =
		'M84 100C95 103 105 99.5 109.5 90C112.6 83.4 112.6 75 109.6 68.6C108.8 67 106.8 67.4 106.8 69.2C107 76.4 104.6 83 99 86.4C94.6 89 89.4 89.4 85 88';
	/** From the root of the tail to its tip, smaller and smaller. */
	const TAIL_PLATES = [
		{ x: 97.4, y: 87.2, angle: -28, h: 8, w: 3.8 },
		{ x: 104.4, y: 80, angle: -58, h: 6.2, w: 3 },
		{ x: 107.2, y: 72.6, angle: -76, h: 4.4, w: 2.2 }
	] as const;
	/** From the sides to the middle, so that the biggest one is in front. */
	const HEAD_PLATES = [
		{ x: 36, y: 38, angle: -52, h: 12, w: 5 },
		{ x: 84, y: 38, angle: 52, h: 12, w: 5 },
		{ x: 46.5, y: 29, angle: -26, h: 17, w: 6.6 },
		{ x: 73.5, y: 29, angle: 26, h: 17, w: 6.6 },
		{ x: 60, y: 26, angle: 0, h: 22, w: 8 }
	] as const;

	/** Where each arm leaves the body, how much its elbow goes out, and how wide its shoulder is. */
	const SHOULDERS: Readonly<Record<ArmPose, { root: Point; bend: number; half: number }>> = {
		down: { root: { x: 37, y: 72 }, bend: 3, half: 6.2 },
		up: { root: { x: 39, y: 80 }, bend: 4, half: 7.2 },
		ground: { root: { x: 39, y: 80 }, bend: 3, half: 7.2 }
	};
	/**
	 * Raised arms grow out of the body: drawn over it and under the head, with no outline where they
	 * join it, so that body and arm make one silhouette. Hanging arms rest in front of the body.
	 */
	const BEHIND: Readonly<Record<ArmPose, boolean>> = { down: false, up: true, ground: true };
	const WRIST_HALF = 3.6;
	/** The hand around the grip (0, 0), its three fingers along +y, its outer side along +x. */
	const HAND_LINE =
		'M3.8 -5.5C5.6 -3.6 6.2 -0.8 5.8 1.8C6.4 3.4 6 5.6 4.6 6.4C3.4 7.1 2.2 6.6 1.9 5.6C1.4 7.4 -1.4 7.6 -2 5.8C-2.6 7 -4.6 6.8 -5.2 5.2C-5.8 3.6 -6 1 -5.6 -1C-5.2 -3 -4.6 -4.4 -3.8 -5.5';
	const HAND = `${HAND_LINE}Z`;
	const FINGER_LINES = 'M1.9 5.6C1.7 4.4 1.6 3.4 1.8 2.6M-2 5.8C-2.3 4.6 -2.5 3.6 -2.4 2.8';
	/** The fingers curled over what the hand holds. */
	const GRIP_FINGERS =
		'M-5.6 -2C-2.6 -3.4 2.6 -3.4 5.8 -2C6.6 0.4 5.8 2.6 4.6 3C1.6 2 -1.6 2 -4.8 3C-6 2.4 -6.4 -0.2 -5.6 -2Z';
	const KNUCKLES = 'M-1.6 -2.8C-1.4 -0.8 -1.4 0.8 -1.6 2.2M1.8 -2.8C2 -0.8 2 0.8 1.8 2.2';

	function armOf(pose: ArmPose, side: Side): Arm {
		const { root, bend, half } = SHOULDERS[pose];
		const grip = ARM_POSES[pose].grip;
		const length = Math.hypot(grip.x - root.x, grip.y - root.y);
		const u = { x: (grip.x - root.x) / length, y: (grip.y - root.y) / length };
		const n = -u.y < 0 ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };
		const at = (base: Point, along: number, out: number): Point => ({
			x: base.x + u.x * along + n.x * out,
			y: base.y + u.y * along + n.y * out
		});
		const flip = (point: Point): Point =>
			side === 'left' ? point : { x: 2 * MIDDLE - point.x, y: point.y };
		const p = (point: Point) => {
			const q = flip(point);
			return `${round(q.x)} ${round(q.y)}`;
		};
		const wrist = at(grip, -4, 0);
		const outerRoot = at(root, 0, half);
		const outerWrist = at(wrist, 0, WRIST_HALF);
		const innerWrist = at(wrist, 0, -WRIST_HALF);
		const innerRoot = at(root, 0, -half);
		const outer = `M${p(outerRoot)}C${p(at(outerRoot, length * 0.35, bend))} ${p(at(outerWrist, -length * 0.3, bend * 0.5))} ${p(outerWrist)}`;
		const innerCurve = `C${p(at(innerWrist, -length * 0.3, bend * 0.3))} ${p(at(innerRoot, length * 0.35, bend * 0.3))} ${p(innerRoot)}`;
		const sign = side === 'left' ? 1 : -1;
		const g = flip(grip);
		return {
			fill: `${outer}L${p(innerWrist)}${innerCurve}Z`,
			outer,
			inner: `M${p(innerWrist)}${innerCurve}`,
			hand: `matrix(${round(n.x * sign)} ${round(n.y)} ${round(u.x * sign)} ${round(u.y)} ${round(g.x)} ${round(g.y)})`
		};
	}

	const ARMS = Object.fromEntries(
		(Object.keys(ARM_POSES) as ArmPose[]).map((pose) => [
			pose,
			{ left: armOf(pose, 'left'), right: armOf(pose, 'right') }
		])
	) as Readonly<Record<ArmPose, Record<Side, Arm>>>;

	const FACES: Readonly<Record<Mood, Face>> = {
		// Wide open eyes at rest: a heavy lid made it look bored (porteur, 2026-10-18).
		idle: {
			look: { x: 0.8, y: 0.4 },
			lid: null,
			smilingEyes: false,
			brow: { outer: { x: 40.4, y: 33.2 }, inner: { x: 54.6, y: 31.8 }, bend: -3 },
			blush: false
		},
		happy: {
			look: { x: 0.4, y: -0.6 },
			lid: null,
			smilingEyes: true,
			brow: { outer: { x: 40, y: 33 }, inner: { x: 54.6, y: 31.4 }, bend: -3 },
			blush: true
		},
		oops: {
			look: { x: -1.4, y: 2.2 },
			lid: -5.6,
			smilingEyes: false,
			brow: { outer: { x: 40.4, y: 36.4 }, inner: { x: 54.6, y: 31.2 }, bend: 1.4 },
			blush: true
		},
		cheer: {
			look: { x: 0, y: 0 },
			lid: null,
			smilingEyes: false,
			brow: { outer: { x: 40.4, y: 32 }, inner: { x: 54.6, y: 29.6 }, bend: -3.4 },
			blush: true
		}
	};

	const IDLE_MOUTH = 'M50.4 65C54.4 67.8 63.6 68.2 70 64.4M69 62.8C70 63.6 70.6 64.6 70.8 65.8';
	const HAPPY_MOUTH =
		'M48 62.5C54 65 66 65 72 62.5C71.6 70 66.6 73.6 60 73.6C53.4 73.6 48.4 70 48 62.5Z';
	const HAPPY_TONGUE = 'M52.5 75C52.5 69.6 56 67.8 60 67.8C64 67.8 67.5 69.6 67.5 75Z';
	const CHEER_MOUTH =
		'M45.6 61C52.6 64 67.4 64 74.4 61C74 70 68.4 74.6 60 74.6C51.6 74.6 46 70 45.6 61Z';
	const CHEER_TONGUE = 'M51 77C51 70.6 55 68.6 60 68.6C65 68.6 69 70.6 69 77Z';
	const OOPS_MOUTH =
		'M51 66.6C53 64.6 55 64.6 57 66.6C59 68.6 61 68.6 63 66.6C65 64.6 67 64.6 69 66.6';
	const SWEAT_DROP =
		'M89.4 31C91.4 35 93 37.6 93 39.6C93 41.6 91.4 43.2 89.6 43.2C87.6 43.2 86.4 41.6 86.6 39.6C86.8 37.6 88 35 89.4 31Z';
	const CLOSED_EYES = both('M41 47.6C43.6 41.6 52.4 41.6 55 47.6');
	const ROAR_MOUTH =
		'M44.6 61.4C52 58.6 68 58.6 75.4 61.4C75 71.6 68.6 75.4 60 75.4C51.4 75.4 45 71.6 44.6 61.4Z';
	const ROAR_TONGUE = 'M50 78C50 71 54.6 69 60 69C65.4 69 70 71 70 78Z';
	const FANGS = both('M49 60.6C49.4 63.2 50.6 65 51.6 65C52.6 65 53.2 63 53.4 59.8Z');
	const ROAR_CURLS = both(ROAR_CURLS_LEFT);
	const ROAR_WAVE = both(ROAR_WAVE_LEFT);

	let { mood, dance = 0, colorId, itemArtIds, trick = null }: Props = $props();

	const uid = $props.id();
	const appearance = companionAppearance();
	const color = $derived(colorId === undefined ? appearance().colorId : colorId);
	const items = $derived(itemArtIds ?? appearance().itemArtIds);
	const worn = $derived(wornBySlot(items));
	const wornIds = $derived(Object.values(worn));
	/** A worn item that also covers the arms (`ItemArt.sleeves`). */
	const sleeves = $derived(
		worn.body !== undefined && ITEM_ARTS[worn.body]?.sleeves ? worn.body : undefined
	);

	const danceIndex = $derived(((dance % DANCES) + DANCES) % DANCES);

	const label = $derived(LABELS[mood]());
	const restArms = $derived<ArmPose>(mood === 'cheer' ? 'up' : 'down');
	const trickArms = $derived<ArmPose | undefined>(trick === null ? undefined : TRICK_ARMS[trick]);
	/** Arms raised now or during the trick: body and arms are then drawn as one shape. */
	const raised = $derived(BEHIND[restArms] || (trickArms !== undefined && BEHIND[trickArms]));
	const face = $derived(FACES[mood]);
	const brows = $derived(both(browPath(face.brow.outer, face.brow.inner, face.brow.bend)));

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function paint(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

<!--
	A form with its own modelling: the shade is the form moved up and left, cut out of a frame and
	kept inside the form; `lights` are drawn inside it too. Its outline can leave out where it joins.
-->
{#snippet form(
	name: string,
	d: string,
	fill: string,
	shade: number,
	outline: string = d,
	lights: readonly string[] = []
)}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={paint(name)}>
		<path
			class="shade"
			fill-rule="evenodd"
			d={FRAME + d}
			transform="translate({-shade} {-shade})"
		/>
		{#each lights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
	<path class="open line" d={outline} />
{/snippet}

{#snippet plate(x: number, y: number, angle: number, h: number, w: number, name: string)}
	<g transform="translate({x} {y}) rotate({angle})">
		{@render form(name, platePath(h, w), 'plate', w * 0.35)}
		<path
			class="open fine"
			d="M0 {round(-h * 0.2)}Q{round(w * 0.12)} {round(-h * 0.5)} 0 {round(-h * 0.78)}"
		/>
	</g>
{/snippet}

{#snippet eye(side: Side)}
	{@const c = EYES[side]}
	{@const look = face.look}
	{@const name = `eye-${side}`}
	<clipPath id={ref(name)}><path d={oval(c.x, c.y, 7.6, 9)} /></clipPath>
	<path class="white" d={oval(c.x, c.y, 7.6, 9)} />
	<g clip-path={paint(name)}>
		<path class="iris" d={oval(c.x + look.x, c.y + look.y, 5, 5.8)} />
		<path class="ink" d={oval(c.x + look.x, c.y + look.y + 0.2, 2.9, 3.5)} />
		<circle class="white" cx={c.x + look.x + 1.7} cy={c.y + look.y - 2.3} r="1.8" />
		<circle class="white" cx={c.x + look.x - 1.6} cy={c.y + look.y + 2.4} r="0.8" />
		<path
			class="shade"
			d="M{c.x - 9} {c.y - 10}L{c.x + 9} {c.y - 10}L{c.x + 9} {c.y - 5}Q{c.x} {c.y - 8} {c.x -
				9} {c.y - 5}Z"
		/>
		{#if face.lid !== null}
			<path
				class="body"
				d="M{c.x - 9} {c.y - 11}L{c.x + 9} {c.y - 11}L{c.x + 9} {c.y + face.lid}Q{c.x} {c.y +
					face.lid +
					3} {c.x - 9} {c.y + face.lid}Z"
			/>
			<path
				class="open line"
				d="M{c.x - 9} {c.y + face.lid}Q{c.x} {c.y + face.lid + 3} {c.x + 9} {c.y + face.lid}"
			/>
		{/if}
		{#if face.smilingEyes}
			<path
				class="body"
				d="M{c.x - 9} {c.y + 11}L{c.x + 9} {c.y + 11}L{c.x + 9} {c.y + 7}Q{c.x} {c.y + 1} {c.x -
					9} {c.y + 7}Z"
			/>
			<path class="open line" d="M{c.x - 9} {c.y + 7}Q{c.x} {c.y + 1} {c.x + 9} {c.y + 7}" />
		{/if}
	</g>
	<path class="open line" d={oval(c.x, c.y, 7.6, 9)} />
{/snippet}

<!--
	`under`: the outline of raised arms, drawn under the body twice as thick, so that only its outer
	half shows and body and arms share one outline, joined at the armpits; `over`: the rest.
-->
{#snippet arms(pose: ArmPose, layer: 'under' | 'over')}
	{#each SIDES as side (side)}
		{@const arm = ARMS[pose][side]}
		{#if layer === 'under'}
			<path class="underlay" d={arm.fill} />
		{:else}
			{#if BEHIND[pose]}
				<clipPath id={ref(`arm-${pose}-${side}`)}><path d={arm.fill} /></clipPath>
				<path class="body" d={arm.fill} />
				<g clip-path={paint('outside-body')}>
					<g clip-path={paint(`arm-${pose}-${side}`)}>
						<path
							class="shade"
							fill-rule="evenodd"
							d={FRAME + arm.fill}
							transform="translate(-1.6 -1.6)"
						/>
					</g>
				</g>
			{:else}
				{@render form(`arm-${pose}-${side}`, arm.fill, 'body', 1.6, arm.outer)}
			{/if}
			{#if sleeves}
				<g clip-path={paint(`arm-${pose}-${side}`)}>
					<g transform={arm.hand}><CompanionItem artId={sleeves} layer="sleeve" /></g>
					<path
						class="shade"
						fill-rule="evenodd"
						d={FRAME + arm.fill}
						transform="translate(-1.6 -1.6)"
					/>
				</g>
				{#if !BEHIND[pose]}
					<path class="open line" d={arm.outer} />
				{/if}
			{/if}
			{#if !BEHIND[pose]}
				<path class="open line" d={arm.inner} />
			{/if}
			<g transform={arm.hand}>
				{@render form(`hand-${pose}-${side}`, HAND, 'body', 1, HAND_LINE)}
				<path class="open fine" d={FINGER_LINES} />
			</g>
		{/if}
	{/each}
	{#if layer === 'over' && worn.hand}
		<CompanionItem artId={worn.hand} grip={ARM_POSES[pose].grip} />
		<g transform={ARMS[pose].left.hand}>
			<path class="body line" d={GRIP_FINGERS} />
			<path class="open fine" d={KNUCKLES} />
		</g>
	{/if}
{/snippet}

<!-- The arms at rest and those of a trick, each drawn behind the body or in front of it. -->
{#snippet armSet(behind: boolean, layer: 'under' | 'over' = 'over')}
	{#if trickArms !== undefined && trickArms !== restArms}
		{#if BEHIND[restArms] === behind}
			<g class="arms-rest trick">{@render arms(restArms, layer)}</g>
		{/if}
		{#if BEHIND[trickArms] === behind}
			<g class="trick appear">{@render arms(trickArms, layer)}</g>
		{/if}
	{:else if BEHIND[restArms] === behind}
		{@render arms(restArms, layer)}
	{/if}
{/snippet}

{#snippet front(artId: string | undefined)}
	{#if artId}
		<CompanionItem {artId} />
	{/if}
{/snippet}

<svg
	class="companion"
	viewBox="0 0 120 120"
	role="img"
	aria-label={label}
	data-mood={mood}
	data-dance={danceIndex}
	data-color={color ?? undefined}
	data-items={items.join(' ') || undefined}
	data-trick={trick ?? undefined}
>
	{#if trick === 'float'}
		<g class="trick appear">
			<path class="shadow" d={SOFT_SHADOW} />
			<path class="sparkle line" d={FLOAT_SPARKLES} />
		</g>
	{:else if trick === 'cartwheel'}
		<g class="trick appear">
			<path class="shadow" d={GROUND_SHADOW} />
			<path class="wave" d={WHEEL_STROKES} />
		</g>
	{:else if trick !== null}
		<path class="shadow trick appear" d={GROUND_SHADOW} />
	{/if}
	{#if mood === 'cheer'}
		<path class="sparkle line" d={SPARKLE_PATH} />
		<path class="sparkle line" d={SPARKLE_PATH} transform="translate(86 -4)" />
	{/if}
	<!-- Everything but the body: where a raised arm may show its outline. -->
	<clipPath id={ref('outside-body')}><path clip-rule="evenodd" d={FRAME + BODY} /></clipPath>
	<g class="dino">
		<g class="pose trick">
			{#if trick === 'juggle'}
				<g class="trick appear">
					<g class="juggle-orbit">
						{#each TOMATOES as tomato, i (tomato.x)}
							<path class="trail" d={tomato.trail} />
							{@render form(`tomato-${i}`, tomato.body, 'tomato', 2.2, tomato.body, [])}
							<path class="open fine" d={tomato.ribs} />
							<path class="gloss" d={tomato.gloss} />
							<path class="leaf line" d={tomato.stem} />
							{@render form(`calyx-${i}`, tomato.calyx, 'leaf', 0.8, tomato.calyx, [])}
						{/each}
					</g>
				</g>
			{:else if trick === 'float'}
				<path class="shadow trick appear" d={FLOAT_LIFT} />
			{:else if trick === 'handstand'}
				<path class="wave trick appear" d={HANDSTAND_WOBBLE} />
			{/if}
			{#each wornIds as artId (artId)}
				<CompanionItem {artId} layer="back" />
			{/each}
			{#each TAIL_PLATES as p, i (i)}
				{@render plate(p.x, p.y, p.angle, p.h, p.w, `tail-plate-${i}`)}
			{/each}
			{@render form('tail', TAIL, 'body', 2.4, TAIL_LINE)}
			<g class="plates trick">
				{#each HEAD_PLATES as p, i (i)}
					{@render plate(p.x, p.y, p.angle, p.h, p.w, `plate-${i}`)}
				{/each}
			</g>
			{#if raised}
				<!-- One shape: a single outline under body and arms, the body's shading over both. -->
				{@render armSet(true, 'under')}
				<path class="underlay" d={BODY} />
				{@render armSet(true)}
				{@render form('body', BODY, 'body', 5, '', [BODY_LIGHT])}
			{:else}
				{@render form('body', BODY, 'body', 5, BODY, [BODY_LIGHT])}
			{/if}
			{@render form('belly', BELLY, 'belly', 2)}
			<g clip-path={paint('belly')}>
				<path class="open fine" d={BELLY_BANDS} />
			</g>
			<g clip-path={paint('body')}>
				<path class="shade" d={CHIN_SHADE} />
			</g>
			<!-- Raised arms cover the creases of the neck: half hidden, they looked like cuts. -->
			{#if !BEHIND[restArms]}
				<g class={trickArms !== undefined && BEHIND[trickArms] ? 'arms-rest trick' : undefined}>
					{#each SIDES as side (side)}
						<path class="open line" d={NECK[side]} />
					{/each}
				</g>
			{/if}
			{#each SIDES as side (side)}
				{@render form(`thigh-${side}`, THIGH[side], 'body', 2.4, THIGH_LINE[side], [
					THIGH_LIGHT[side]
				])}
				<path class="open line" d={THIGH_CREASE[side]} />
				{@render form(`foot-${side}`, FOOT[side], 'body', 1.8)}
				<path class="open fine" d={TOES[side]} />
				<path class="claw fine" d={CLAWS[side]} />
			{/each}
			{@render front(worn.body)}
			{@render front(worn.back)}
			{@render form('head', HEAD, 'body', 4.5, HEAD, [HEAD_LIGHT, SNOUT_LIGHT])}
			<path class="open fine" d={SNOUT_RIDGE} />
			{#if face.blush}
				{#each SIDES as side (side)}
					<path class="cheek" d={CHEEKS[side]} />
				{/each}
			{/if}
			{#if mood === 'cheer'}
				{#each SIDES as side (side)}
					<path class="open line bold" d={CLOSED_EYES[side]} />
				{/each}
			{:else}
				<g class="eyes">
					{#each SIDES as side (side)}
						{@render eye(side)}
					{/each}
				</g>
			{/if}
			{#each SIDES as side (side)}
				<path class="ink line" d={brows[side]} />
				<path class="ink" d={NOSTRILS[side]} />
			{/each}
			{#if mood === 'oops'}
				<path class="open line" d={OOPS_MOUTH} />
				<path class="drop line" d={SWEAT_DROP} />
			{:else if mood === 'happy'}
				{@render form('mouth', HAPPY_MOUTH, 'ink', 0, HAPPY_MOUTH, [])}
				<g clip-path={paint('mouth')}><path class="tongue" d={HAPPY_TONGUE} /></g>
			{:else if mood === 'cheer'}
				{@render form('mouth', CHEER_MOUTH, 'ink', 0, CHEER_MOUTH, [])}
				<g clip-path={paint('mouth')}><path class="tongue" d={CHEER_TONGUE} /></g>
			{:else}
				<path class="open line" d={IDLE_MOUTH} />
			{/if}
			{#if trick === 'roar'}
				<g class="trick appear">
					<clipPath id={ref('roar')}><path d={ROAR_MOUTH} /></clipPath>
					<path class="ink line" d={ROAR_MOUTH} />
					<g clip-path={paint('roar')}><path class="tongue" d={ROAR_TONGUE} /></g>
					{#each SIDES as side (side)}
						<path class="white line" d={FANGS[side]} />
						<path class="wave" d={ROAR_WAVE[side]} />
						<path class="open line" d={ROAR_CURLS[side]} />
					{/each}
				</g>
			{/if}
			{@render front(worn.neck)}
			{@render front(worn.feet)}
			{@render front(worn.face)}
			{@render front(worn.head)}
			{@render armSet(false)}
		</g>
	</g>
</svg>

<style>
	.companion {
		--dd-companion-body: var(--dd-color-companion-body);
		--dd-companion-belly: var(--dd-color-companion-belly);
		--dd-companion-plate: var(--dd-color-companion-plate);
		--dd-companion-cheek: var(--dd-color-companion-cheek);

		inline-size: var(--dd-size-companion);
		block-size: var(--dd-size-companion);
		overflow: visible;
	}

	.companion[data-color='sky'] {
		--dd-companion-body: var(--dd-color-companion-sky-body);
		--dd-companion-belly: var(--dd-color-companion-sky-belly);
		--dd-companion-plate: var(--dd-color-companion-sky-plate);
		--dd-companion-cheek: var(--dd-color-companion-sky-cheek);
	}

	.companion[data-color='violet'] {
		--dd-companion-body: var(--dd-color-companion-violet-body);
		--dd-companion-belly: var(--dd-color-companion-violet-belly);
		--dd-companion-plate: var(--dd-color-companion-violet-plate);
		--dd-companion-cheek: var(--dd-color-companion-violet-cheek);
	}

	.companion[data-color='orange'] {
		--dd-companion-body: var(--dd-color-companion-orange-body);
		--dd-companion-belly: var(--dd-color-companion-orange-belly);
		--dd-companion-plate: var(--dd-color-companion-orange-plate);
		--dd-companion-cheek: var(--dd-color-companion-orange-cheek);
	}

	.companion[data-color='pink'] {
		--dd-companion-body: var(--dd-color-companion-pink-body);
		--dd-companion-belly: var(--dd-color-companion-pink-belly);
		--dd-companion-plate: var(--dd-color-companion-pink-plate);
		--dd-companion-cheek: var(--dd-color-companion-pink-cheek);
	}

	.companion[data-color='yellow'] {
		--dd-companion-body: var(--dd-color-companion-yellow-body);
		--dd-companion-belly: var(--dd-color-companion-yellow-belly);
		--dd-companion-plate: var(--dd-color-companion-yellow-plate);
		--dd-companion-cheek: var(--dd-color-companion-yellow-cheek);
	}

	.companion[data-color='turquoise'] {
		--dd-companion-body: var(--dd-color-companion-turquoise-body);
		--dd-companion-belly: var(--dd-color-companion-turquoise-belly);
		--dd-companion-plate: var(--dd-color-companion-turquoise-plate);
		--dd-companion-cheek: var(--dd-color-companion-turquoise-cheek);
	}

	.companion[data-color='tomato'] {
		--dd-companion-body: var(--dd-color-companion-tomato-body);
		--dd-companion-belly: var(--dd-color-companion-tomato-belly);
		--dd-companion-plate: var(--dd-color-companion-tomato-plate);
		--dd-companion-cheek: var(--dd-color-companion-tomato-cheek);
	}

	.underlay {
		fill: var(--dd-color-companion-line);
		stroke: var(--dd-color-companion-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.fine {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thin);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.shade {
		fill: var(--dd-color-companion-shade);
		fill-opacity: var(--dd-opacity-companion-shade);
	}

	.light {
		fill: var(--dd-color-companion-light);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.iris {
		fill: var(--dd-companion-plate);
	}

	.tongue {
		fill: var(--dd-color-companion-tongue);
	}

	.claw,
	.drop {
		fill: var(--dd-color-companion-eye);
	}

	.body {
		fill: var(--dd-companion-body);
	}

	.belly {
		fill: var(--dd-companion-belly);
	}

	.plate {
		fill: var(--dd-companion-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.sparkle {
		fill: var(--dd-color-star-fill);
	}

	.cheek {
		fill: var(--dd-companion-cheek);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.open {
		fill: transparent;
	}

	.tomato {
		fill: var(--dd-color-wear-red);
	}

	.gloss {
		fill: var(--dd-color-companion-light);
	}

	.wave {
		fill: var(--dd-color-companion-line);
	}

	.trail {
		fill: var(--dd-color-wear-red);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.leaf {
		fill: var(--dd-color-wear-leaf);
	}

	.shadow {
		fill: var(--dd-color-companion-shadow);
	}

	[data-mood='happy'] .dino,
	[data-mood='cheer'] .dino {
		animation-name: hop;
		animation-duration: var(--dd-duration-beat);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='cheer'] .dino {
		animation-iteration-count: 3;
	}

	[data-mood='cheer'] .dino {
		transform-box: fill-box;
		transform-origin: 50% 100%;
	}

	[data-mood='cheer'][data-dance='1'] .dino {
		animation-name: spin;
		animation-iteration-count: 2;
	}

	[data-mood='cheer'][data-dance='2'] .dino {
		animation-name: wiggle;
	}

	[data-mood='cheer'][data-dance='3'] .dino {
		animation-name: stretch;
	}

	[data-mood='cheer'][data-dance='4'] .dino {
		animation-name: slide;
		animation-iteration-count: 2;
	}

	[data-mood='oops'] .dino {
		animation-name: nod;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
	}

	[data-mood='idle'] .eyes {
		transform-box: fill-box;
		transform-origin: center;
		animation-name: blink;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
	}

	/*
	 * A trick goes to its pose and comes back: two runs, the second one reversed. When motion is
	 * reduced (app.css keeps one run of a millisecond) or under `data-still`, it stops on the pose.
	 */
	.trick {
		animation-duration: var(--dd-duration-trick);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: 2;
		animation-direction: alternate;
		animation-fill-mode: both;
	}

	.pose,
	.plates,
	.juggle-orbit {
		transform-box: view-box;
	}

	.pose {
		transform-origin: 60px 58px;
	}

	.plates {
		transform-origin: 60px 27px;
	}

	.juggle-orbit {
		transform-origin: 60px 40px;
		animation-name: orbit;
		animation-duration: var(--dd-duration-trick-orbit);
		animation-timing-function: var(--dd-easing-steady);
		animation-iteration-count: 2;
	}

	.appear {
		animation-name: appear;
	}

	.arms-rest {
		animation-name: vanish;
	}

	.companion[data-trick='roar'] .pose {
		animation-name: shake;
		animation-duration: var(--dd-duration-trick-shake);
		animation-iteration-count: 8;
		animation-direction: normal;
		animation-fill-mode: none;
	}

	.companion[data-trick='roar'] .plates {
		animation-name: plates-up;
	}

	.companion[data-trick='handstand'] .pose {
		animation-name: handstand;
	}

	.companion[data-trick='float'] .pose {
		animation-name: float;
	}

	.companion[data-trick='cartwheel'] .pose {
		animation-name: cartwheel;
	}

	@keyframes hop {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}

	@keyframes spin {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 360deg;
		}
	}

	@keyframes wiggle {
		0%,
		100% {
			rotate: 0deg;
		}

		25% {
			rotate: -12deg;
		}

		75% {
			rotate: 12deg;
		}
	}

	@keyframes stretch {
		0%,
		100% {
			scale: 1 1;
		}

		40% {
			scale: 0.9 1.15;
		}

		70% {
			scale: 1.1 0.9;
		}
	}

	@keyframes slide {
		0%,
		100% {
			translate: 0 0;
		}

		25% {
			translate: calc(var(--dd-space-md) * -1) 0;
		}

		75% {
			translate: var(--dd-space-md) 0;
		}
	}

	@keyframes nod {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 var(--dd-space-xs);
		}
	}

	@keyframes blink {
		0%,
		100% {
			scale: 1 1;
		}
		50% {
			scale: 1 0.1;
		}
	}

	@keyframes appear {
		0%,
		20% {
			opacity: 0;
		}

		35%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes vanish {
		0%,
		20% {
			opacity: 100%;
		}

		35%,
		100% {
			opacity: 0;
		}
	}

	@keyframes shake {
		0%,
		100% {
			translate: 0 0;
		}

		25% {
			translate: calc(var(--dd-space-xs) * -1) 0;
		}

		75% {
			translate: var(--dd-space-xs) 0;
		}
	}

	@keyframes plates-up {
		0%,
		15% {
			scale: 1 1;
		}

		100% {
			scale: 1.1 1.5;
		}
	}

	@keyframes handstand {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		50% {
			translate: 0 calc(var(--dd-space-md) * -1);
		}

		100% {
			rotate: 180deg;
			translate: 0 0;
		}
	}

	@keyframes float {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		35% {
			rotate: -5deg;
		}

		70% {
			rotate: 5deg;
		}

		100% {
			rotate: 0deg;
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}

	@keyframes cartwheel {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		50% {
			translate: var(--dd-space-md) 0;
		}

		100% {
			rotate: 450deg;
			translate: 0 0;
		}
	}

	@keyframes orbit {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 360deg;
		}
	}

	/* A picture of a trick (`data-still` on an ancestor) shows its pose at once, without moving. */
	:global([data-still]) .companion .trick,
	:global([data-still]) .companion .juggle-orbit,
	:global([data-still]) .companion .eyes {
		animation-duration: var(--dd-duration-instant);
		animation-delay: var(--dd-duration-instant);
		animation-iteration-count: 1;
	}

	:global([data-silhouette]) .companion :not(.open) {
		fill: var(--dd-color-silhouette);
	}

	:global([data-silhouette]) .companion * {
		stroke: var(--dd-color-silhouette);
	}

	/* The shadow on the ground stays a shadow under a silhouette. */
	:global([data-silhouette]) .companion .shadow {
		fill: var(--dd-color-companion-shadow);
	}
</style>
