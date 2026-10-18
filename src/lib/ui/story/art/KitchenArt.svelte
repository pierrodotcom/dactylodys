<script lang="ts">
	import { starPath } from '$lib/ui/companion/geometry';
	import StoryDino from '../StoryDino.svelte';

	const uid = $props.id();

	interface Props {
		/** One of `STORY_ART_GROUPS.kitchen`. */
		art: string;
	}

	type Point = readonly [number, number];
	type ToastMood = 'stern' | 'puzzled';
	type Tone = 'a' | 'b' | 'c' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'm' | 'o';
	interface Drip {
		/** Position across the cream, from -1 (left) to 1 (right). */
		u: number;
		len: number;
	}

	const WIDTH = 160;
	const HEIGHT = 100;
	const TILE_W = 12;
	const TILE_H = 6;
	/** The companion's own drawing is 120 units wide (`Companion.svelte`). */
	const DINO_BOX = 120;
	/** Where the left hand of a happy companion holds things, in its own square. */
	const DINO_GRIP: Point = [27, 89];

	const OPENING_DINO = { x: 44, y: 6, size: 72 } as const;
	const SPICES_DINO = { x: 2, y: 12, size: 78 } as const;
	const ENDING_DINO = { x: 8, y: 2, size: 70 } as const;

	/** A wrist at (0, 0), the fingers towards +y. */
	const MITTEN = 'M-2.3 0.2C-3 2 -3.1 4.6 -1.9 6C-0.7 7.3 1.6 7.2 2.6 5.8C3.4 4.6 3.1 1.8 2.3 0.2Z';
	const THUMB = 'M-2.1 1.4C-4.4 0.8 -5.7 3.2 -4.3 4.5C-3.4 5.2 -2.4 4.7 -1.9 4Z';
	const FINGER = 'M0.3 7Q0.5 5.6 0.2 4.4';
	/** An ankle at (0, 0), the toe towards +x. */
	const SHOE =
		'M-1.6 -0.6C-2.2 -2.8 1 -3.2 2.4 -1.7C4.6 -1.5 5.8 0.2 5.1 1.7C4.6 2.4 -1.2 2.5 -1.8 1.5C-2.1 0.9 -1.9 0.2 -1.6 -0.6Z';

	/** The toast, the middle of its bottom edge at (0, 0). */
	const TOAST_BODY =
		'M-16 0C-18.5 0 -19.5 -1 -19.5 -3.5C-19.5 -14 -18.5 -22 -18.5 -29C-26 -31 -28 -38 -25.5 -43C-22.5 -49 -15 -50 -11 -47.5C-7 -52.5 7 -52.5 11 -47.5C15 -50 22.5 -49 25.5 -43C28 -38 26 -31 18.5 -29C18.5 -22 19.5 -14 19.5 -3.5C19.5 -1 18.5 0 16 0Z';
	const TOAST_CRUMB =
		'M-13.5 -3.5C-15.5 -3.5 -16 -4.5 -16 -6.5C-16 -15 -15 -23 -15 -31.5C-22 -33 -23.5 -38 -21.5 -41.5C-19.5 -45.5 -14 -46 -10.5 -43.5C-6 -48.5 6 -48.5 10.5 -43.5C14 -46 19.5 -45.5 21.5 -41.5C23.5 -38 22 -33 15 -31.5C15 -23 16 -15 16 -6.5C16 -4.5 15.5 -3.5 13.5 -3.5Z';
	const TOAST_SHADE = 'M7 -54C15 -40 13 -14 5 2H32V-54Z';
	const TOAST_LIGHT =
		'M-19.5 -38C-18.5 -42.5 -14 -44 -10.5 -42C-14 -41 -16.5 -38.5 -17 -35.5ZM-14 -28C-13.5 -20 -13.5 -13 -12.5 -7C-11.5 -13 -11.5 -20 -12 -28Z';
	const TOAST_PORES: readonly Point[] = [
		[-9, -12],
		[10, -9],
		[-5, -39],
		[9, -37],
		[1, -6],
		[-11, -20]
	];

	/** The chef's hat, the middle of the bottom of its band at (0, 0). */
	const TOQUE_BAND = 'M-10.5 0C-4 1.6 4 1.6 10.5 0L11.5 -7C4 -5.6 -4 -5.6 -11.5 -7Z';
	const TOQUE_PUFF =
		'M-11.5 -6.2C-19 -6 -21.5 -15 -14.5 -18C-14 -25 -5 -27 -1 -22.5C3 -28 13 -26 13.5 -19C20.5 -17 19.5 -6.5 11.5 -6.2Z';
	const TOQUE_SHADE = 'M5 -30C12 -20 10 -10 3 2H24V-30Z';
	const TOQUE_LIGHT = 'M-16.5 -14C-17 -17.5 -14 -19.5 -11.5 -18.5C-13.5 -17 -14.5 -15.5 -14.5 -13Z';

	const CAKE_X = 68;
	const CAKE_BASE = 83;
	const CEILING = 9;
	const CAKE_LEAN = 0.0044;
	const CREAM_EDGE = 0.6;
	const CAKE_TIERS = [
		{
			bottom: 83,
			top: 67,
			w: 25,
			sponge: 'f-pink',
			drips: [
				{ u: -0.8, len: 4 },
				{ u: 0.85, len: 3 }
			]
		},
		{
			bottom: 68,
			top: 57,
			w: 22,
			sponge: 'f-sponge',
			drips: [
				{ u: -0.6, len: 4 },
				{ u: 0.1, len: 2.5 },
				{ u: 0.7, len: 3.5 }
			]
		},
		{
			bottom: 58,
			top: 48,
			w: 19.5,
			sponge: 'f-pink',
			drips: [
				{ u: -0.8, len: 2.5 },
				{ u: -0.1, len: 4 },
				{ u: 0.6, len: 3 }
			]
		},
		{
			bottom: 49,
			top: 40,
			w: 17.5,
			sponge: 'f-sponge',
			drips: [
				{ u: -0.5, len: 3.5 },
				{ u: 0.35, len: 2.5 },
				{ u: 0.85, len: 3.5 }
			]
		},
		{
			bottom: 41,
			top: 32,
			w: 16,
			sponge: 'f-pink',
			drips: [
				{ u: -0.75, len: 2.5 },
				{ u: 0, len: 3.5 },
				{ u: 0.65, len: 2.5 }
			]
		},
		{
			bottom: 33,
			top: 24,
			w: 15,
			sponge: 'f-sponge',
			drips: [
				{ u: -0.4, len: 3 },
				{ u: 0.5, len: 2.5 }
			]
		}
	] as const;
	const CAKE_DEPTH = 2.6;
	const SQUASH_W = 15;
	const SPLAT_DRIPS: readonly Drip[] = [
		{ u: -0.92, len: 6 },
		{ u: -0.55, len: 3 },
		{ u: 0.2, len: 2.5 },
		{ u: 0.62, len: 4 },
		{ u: 0.93, len: 7 }
	];

	const SNEEZE_SPARKS: readonly { x: number; y: number; r: number; tone: Tone; star: boolean }[] = [
		{ x: 56, y: 49, r: 2.6, tone: 'c', star: false },
		{ x: 64, y: 43, r: 3.2, tone: 'a', star: true },
		{ x: 67, y: 54, r: 2.6, tone: 'o', star: false },
		{ x: 76, y: 36, r: 4, tone: 'c', star: false },
		{ x: 79, y: 50, r: 3.6, tone: 'j', star: true },
		{ x: 81, y: 60, r: 3, tone: 'm', star: false },
		{ x: 92, y: 28, r: 4.6, tone: 'i', star: false },
		{ x: 95, y: 44, r: 5, tone: 'c', star: true },
		{ x: 96, y: 60, r: 3.6, tone: 'f', star: false },
		{ x: 110, y: 23, r: 4.6, tone: 'g', star: true },
		{ x: 112, y: 39, r: 6, tone: 'o', star: false },
		{ x: 111, y: 58, r: 4.6, tone: 'a', star: false },
		{ x: 128, y: 23, r: 5, tone: 'm', star: false },
		{ x: 130, y: 43, r: 6.5, tone: 'c', star: true },
		{ x: 128, y: 62, r: 4.6, tone: 'b', star: false },
		{ x: 146, y: 27, r: 5, tone: 'j', star: true },
		{ x: 148, y: 48, r: 5.5, tone: 'e', star: false },
		{ x: 146, y: 65, r: 4, tone: 'g', star: false }
	];
	const SNEEZE_DOTS: readonly { x: number; y: number; tone: Tone }[] = [
		{ x: 71, y: 45, tone: 'f' },
		{ x: 86, y: 39, tone: 'e' },
		{ x: 88, y: 55, tone: 'b' },
		{ x: 102, y: 33, tone: 'a' },
		{ x: 104, y: 51, tone: 'h' },
		{ x: 120, y: 30, tone: 'c' },
		{ x: 121, y: 52, tone: 'j' },
		{ x: 138, y: 34, tone: 'o' },
		{ x: 138, y: 55, tone: 'i' },
		{ x: 155, y: 38, tone: 'a' },
		{ x: 155, y: 58, tone: 'm' }
	];
	const STAR_INNER = 0.45;

	const PLATE_STACK = [0, 1, 2, 3, 4];
	const PLATE_STEP = 3.2;

	let { art }: Props = $props();

	function r(value: number): number {
		return Math.round(value * 100) / 100;
	}

	function at(point: Point): string {
		return `${r(point[0])} ${r(point[1])}`;
	}

	function normal(from: Point, to: Point): Point {
		const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
		return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
	}

	function shift(point: Point, direction: Point, by: number): Point {
		return [point[0] + direction[0] * by, point[1] + direction[1] * by];
	}

	/** A soft tube along a curve that bends at `bend`, `from` thick at its start, `to` at its round tip. */
	function limb(start: Point, bend: Point, end: Point, from: number, to: number): string {
		const n0 = normal(start, bend);
		const n1 = normal(bend, end);
		const miter = 1 + n0[0] * n1[0] + n0[1] * n1[1];
		const nb: Point = [(n0[0] + n1[0]) / miter, (n0[1] + n1[1]) / miter];
		const middle = (from + to) / 2;
		return (
			`M${at(shift(start, n0, from))}Q${at(shift(bend, nb, middle))} ${at(shift(end, n1, to))}` +
			`A${to} ${to} 0 0 0 ${at(shift(end, n1, -to))}` +
			`Q${at(shift(bend, nb, -middle))} ${at(shift(start, n0, -from))}Z`
		);
	}

	function dinoFrame(dino: { x: number; y: number; size: number }): string {
		return `translate(${dino.x} ${dino.y}) scale(${dino.size / DINO_BOX})`;
	}

	function dinoGrip(dino: { x: number; y: number; size: number }): Point {
		const scale = dino.size / DINO_BOX;
		return [dino.x + DINO_GRIP[0] * scale, dino.y + DINO_GRIP[1] * scale];
	}

	/** Subway tiles: rows of long tiles, every other row shifted by half a tile. */
	function subwayGrid(top: number, bottom: number): string {
		const parts: string[] = [];
		for (let row = 0; top + row * TILE_H < bottom; row++) {
			const y0 = top + row * TILE_H;
			const y1 = Math.min(bottom, y0 + TILE_H);
			if (row > 0) parts.push(`M0 ${y0}H${WIDTH}`);
			for (let x = row % 2 ? TILE_W / 2 : TILE_W; x < WIDTH; x += TILE_W)
				parts.push(`M${x} ${y0}V${y1}`);
		}
		return parts.join('');
	}

	/** A four-pointed twinkle with curved sides. */
	function twinkle(x: number, y: number, size: number): string {
		const c = size * 0.2;
		return (
			`M${r(x)} ${r(y - size)}Q${r(x + c)} ${r(y - c)} ${r(x + size)} ${r(y)}` +
			`Q${r(x + c)} ${r(y + c)} ${r(x)} ${r(y + size)}Q${r(x - c)} ${r(y + c)} ${r(x - size)} ${r(y)}` +
			`Q${r(x - c)} ${r(y - c)} ${r(x)} ${r(y - size)}Z`
		);
	}

	/** An ellipse whose edge bulges out in `bumps` rounded flutes, like a tart crust. */
	function flutedEllipse(rx: number, ry: number, bumps: number, depth: number): string {
		const point = (angle: number, k: number): string =>
			at([Math.cos(angle) * rx * k, Math.sin(angle) * ry * k]);
		const parts = [`M${point(0, 1)}`];
		for (let i = 0; i < bumps; i++) {
			const a0 = (i / bumps) * 2 * Math.PI;
			const a1 = ((i + 1) / bumps) * 2 * Math.PI;
			parts.push(`Q${point((a0 + a1) / 2, 1 + depth)} ${point(a1, 1)}`);
		}
		return `${parts.join('')}Z`;
	}

	/** The wall of the tart under its rim: bottom ellipse centred `depth` lower. */
	function flutes(rx: number, ry: number, depth: number, xs: readonly number[]): string {
		return xs
			.map((x) => {
				const top = ry * Math.sqrt(1 - (x / rx) ** 2);
				const bottom = depth + (ry - 1) * Math.sqrt(1 - (x / (rx - 2)) ** 2);
				return `M${r(x)} ${r(top)}L${r(x * 0.95)} ${r(bottom)}`;
			})
			.join('');
	}

	function spineX(y: number): number {
		return CAKE_X + CAKE_LEAN * (CAKE_BASE - y) ** 2;
	}

	function tierPath(bottom: number, top: number, w: number): string {
		const bx = spineX(bottom);
		const tx = spineX(top);
		const my = (bottom + top) / 2;
		const mx = spineX(my);
		return (
			`M${r(bx - w)} ${bottom}Q${r(mx - w - 1.2)} ${my} ${r(tx - w)} ${top}` +
			`L${r(tx + w)} ${top}Q${r(mx + w + 1.2)} ${my} ${r(bx + w)} ${bottom}` +
			`A${w} ${CAKE_DEPTH} 0 0 1 ${r(bx - w)} ${bottom}Z`
		);
	}

	/** Cream over the top of a layer (an ellipse `depth` deep), running down in drips. */
	function creamPath(
		cx: number,
		top: number,
		w: number,
		depth: number,
		drips: readonly Drip[]
	): string {
		const half = w + CREAM_EDGE;
		const edge = (x: number): number =>
			top + 2 + depth * Math.sqrt(Math.max(0, 1 - ((x - cx) / half) ** 2));
		const parts = [
			`M${r(cx - half)} ${top}A${half} ${depth} 0 0 1 ${r(cx + half)} ${top}`,
			`L${r(cx + half)} ${r(edge(cx + half))}`
		];
		let x = cx + half;
		const sorted = [...drips].sort((a, b) => b.u - a.u);
		for (const drip of sorted) {
			const middle = cx + drip.u * w;
			const right = middle + 1.3;
			const left = middle - 1.3;
			const low = edge(middle) + drip.len;
			parts.push(
				`Q${r((x + right) / 2)} ${r(edge((x + right) / 2) + 1)} ${r(right)} ${r(edge(right))}`
			);
			parts.push(
				`L${r(right)} ${r(low)}A1.3 1.3 0 0 1 ${r(left)} ${r(low)}L${r(left)} ${r(edge(left))}`
			);
			x = left;
		}
		const end = cx - half;
		parts.push(`Q${r((x + end) / 2)} ${r(edge((x + end) / 2) + 1)} ${r(end)} ${r(edge(end))}Z`);
		return parts.join('');
	}

	/** The upper part of an eye, cut straight `drop` above its centre: a heavy lid. */
	function lidPath(x: number, y: number, radius: number, drop: number): string {
		const half = Math.sqrt(radius * radius - drop * drop);
		return `M${r(x - half)} ${r(y - drop)}A${radius} ${radius} 0 0 1 ${r(x + half)} ${r(y - drop)}Z`;
	}

	const squashX = spineX(24);
	const SQUASHED_TIER = `M${r(squashX - SQUASH_W)} 24C${r(squashX - 22)} 21 ${r(squashX - 27)} 14 ${r(squashX - 25)} ${CEILING}H${r(squashX + 31)}C${r(squashX + 33)} 14 ${r(squashX + 27)} 21 ${r(squashX + SQUASH_W)} 24A${SQUASH_W} ${CAKE_DEPTH} 0 0 1 ${r(squashX - SQUASH_W)} 24Z`;
	const SPLAT = creamPath(squashX + 3, CEILING, 36, 0, SPLAT_DRIPS);
	const CRACKS = `M${r(squashX - 27)} ${CEILING}L${r(squashX - 31)} 5.5L${r(squashX - 37)} 6.5L${r(squashX - 41)} 2.5M${r(squashX + 35)} ${CEILING}L${r(squashX + 39)} 6L${r(squashX + 45)} 7L${r(squashX + 49)} 3`;
	const TIER_SHAPES = CAKE_TIERS.map((tier) => ({
		...tier,
		path: tierPath(tier.bottom, tier.top, tier.w),
		cream: creamPath(spineX(tier.top), tier.top, tier.w, CAKE_DEPTH, tier.drips),
		shade: `M${r(spineX(tier.top) + tier.w * 0.35)} ${tier.top - 4}C${r(spineX(tier.bottom) + tier.w * 0.5)} ${tier.top + 4} ${r(spineX(tier.bottom) + tier.w * 0.45)} ${tier.bottom} ${r(spineX(tier.bottom) + tier.w * 0.2)} ${tier.bottom + 4}H${r(spineX(tier.bottom) + tier.w + 4)}V${tier.top - 4}Z`
	}));

	const QUICHE_RX = 28;
	const QUICHE_RY = 12;
	const QUICHE_WALL = 9;
	const QUICHE_RIM = flutedEllipse(QUICHE_RX, QUICHE_RY, 22, 0.09);
	const QUICHE_SIDE = `M-${QUICHE_RX} 0L-${QUICHE_RX - 2} ${QUICHE_WALL}A${QUICHE_RX - 2} ${QUICHE_RY - 1} 0 0 0 ${QUICHE_RX - 2} ${QUICHE_WALL}L${QUICHE_RX} 0Z`;
	const QUICHE_FLUTES = flutes(QUICHE_RX, QUICHE_RY, QUICHE_WALL, [-21, -14, -7, 0, 7, 14, 21]);
	const QUICHE_MOUTH = 'M-7.5 0.5Q0 2.2 7.5 0.5Q6.8 8 0 8Q-6.8 8 -7.5 0.5Z';

	const PAN_BODY =
		'M21 48C21 60 22 72 25 76.5Q27 79.5 31 79.5H61Q65 79.5 67 76.5C70 72 71 60 71 48Z';
	const PAN_MOUTH =
		'M40 66.5C42 63.5 51 63.8 52.5 66.8C54 70.5 50.5 75.5 46 75.4C41.4 75.3 38.5 69.8 40 66.5Z';
	const PAN_LID =
		'M0 0C0 -3.5 12 -8 26.5 -8C41 -8 53 -3.5 53 0C53 1.6 41 2.6 26.5 2.6C12 2.6 0 1.6 0 0Z';
	const SONG =
		'M46 68.5C55 64 66 67.5 76 62C86 56.5 88 44 98 36C106 29.5 112 30 118 24.5L120.5 31.5C114 35 109 34.5 103 40C95 47.5 92 60 81 67C70 73.5 57 71 47 71.5Z';

	const CHEF_X = 131;
	const CHEF_TORSO = 'M-24 100C-24 82 -21 66 -10 61C-4 58.5 4 58.5 10 61C21 66 24 82 24 100Z';
	const CHEF_HEAD =
		'M0 26.5C7.5 26.5 12.5 32.5 12.5 40C12.5 47.5 7 53.5 0 53.5C-7 53.5 -12.5 47.5 -12.5 40C-12.5 32.5 -7.5 26.5 0 26.5Z';

	const NAPKIN =
		'M41 69.9A29 29 0 0 0 79 69.9L86 66.5Q85 72 81 76C80 88 72 100 60 103C48 100 40 88 39 76Q35 72 34 66.5Z';
	const BELLY =
		'M40 69.6A29 29 0 0 0 80 69.6C90 76 93 95 85 104C77 112 43 112 35 104C27 95 30 76 40 69.6Z';

	const FORK = forkPath();

	/** A fork held at (0, 0), its tines up. */
	function forkPath(): string {
		const tines = 3;
		const tine = 1.5;
		const gap = 1.2;
		const half = (tines * tine + (tines - 1) * gap) / 2;
		const parts = ['M-1.2 8Q-1.5 0 -0.8 -11C-0.8 -13 ' + `${-half} -14 ${-half} -17`];
		for (let i = 0; i < tines; i++) {
			const left = -half + i * (tine + gap);
			const right = left + tine;
			parts.push(`V-25A${tine / 2} ${tine / 2} 0 0 1 ${r(right)} -25`);
			if (i < tines - 1) parts.push(`V-19.5A${gap / 2} ${gap / 2} 0 0 0 ${r(right + gap)} -19.5`);
		}
		parts.push(`V-17C${half} -14 0.8 -13 0.8 -11Q1.5 0 1.2 8A1.2 1.2 0 0 1 -1.2 8Z`);
		return parts.join('');
	}
</script>

<!-- A mitten with a thumb, its wrist at (x, y); `angle` turns the fingers away from +y. -->
{#snippet hand(
	x: number,
	y: number,
	angle: number,
	fill: string,
	side: 1 | -1 = 1,
	scale: number = 1
)}
	<g transform="translate({x} {y}) rotate({angle}) scale({side * scale} {scale})">
		<path class="line {fill}" d={THUMB} />
		<path class="line {fill}" d={MITTEN} />
		<path class="line thin open" d={FINGER} />
	</g>
{/snippet}

{#snippet shoe(x: number, y: number, side: 1 | -1)}
	<g transform="translate({x} {y}) scale({side} 1)">
		<path class="line f-dark" d={SHOE} />
		<path class="light" d="M0 -1.6Q1.6 -2.2 2.6 -1.2Q1.4 -1.2 0.4 -0.8Z" />
	</g>
{/snippet}

{#snippet eye(x: number, y: number, radius: number, lookX: number, lookY: number)}
	<circle class="line f-white" cx={x} cy={y} r={radius} />
	<circle class="f-ink" cx={x + lookX} cy={y + lookY} r={radius * 0.55} />
	<circle
		class="f-white"
		cx={x + lookX - radius * 0.2}
		cy={y + lookY - radius * 0.22}
		r={radius * 0.18}
	/>
{/snippet}

<!-- A flat shape with its own shadow and light, clipped inside it, under its outline. -->
{#snippet modeled(id: string, d: string, fill: string, shade: string, light: string, bold: boolean)}
	<clipPath id="{uid}-{id}"><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path="url(#{uid}-{id})">
		<path class="shade" d={shade} />
		<path class="light" d={light} />
	</g>
	<path class="line open" class:bold {d} />
{/snippet}

{#snippet wall(tileTop: number, tileBottom: number)}
	<rect class="f-wall" width={WIDTH} height={HEIGHT} />
	<rect class="shade" width={WIDTH} height="5" />
	<rect class="f-tile" y={tileTop} width={WIDTH} height={tileBottom - tileTop} />
	<path class="grout" d={subwayGrid(tileTop, tileBottom)} />
	<path class="line thin open" d="M0 {tileTop}H{WIDTH}" />
{/snippet}

<!-- A worktop seen from slightly above, its top surface from `y` to `y + 4`, cupboards below. -->
{#snippet counter(y: number)}
	<rect class="line f-wood" x="-2" y={y + 4} width={WIDTH + 4} height={HEIGHT} />
	{#each [0, 40, 80, 120] as door (door)}
		<rect class="line thin open" x={door + 3} y={y + 9} width="34" height={HEIGHT} rx="2" />
		<rect class="light" x={door + 5} y={y + 11} width="1.4" height={HEIGHT} rx="0.7" />
		<circle class="line f-metal" cx={door % 80 === 0 ? door + 33 : door + 7} cy={y + 14} r="1.4" />
	{/each}
	<rect class="shade" x="-2" y={y + 4} width={WIDTH + 4} height="3" />
	<rect class="line f-rock" x="-2" {y} width={WIDTH + 4} height="4.5" />
	<rect class="light" x="-2" y={y + 0.9} width={WIDTH + 4} height="1.3" />
{/snippet}

{#snippet shelf(x1: number, x2: number, y: number)}
	<rect class="shade" x={x1 + 1} y={y + 3} width={x2 - x1 - 2} height="3" rx="1.5" />
	<path class="line f-wood" d="M{x1 + 5} {y + 2}V{y + 8}Q{x1 + 6} {y + 3.5} {x1 + 12} {y + 2.5}Z" />
	<path class="line f-wood" d="M{x2 - 5} {y + 2}V{y + 8}Q{x2 - 6} {y + 3.5} {x2 - 12} {y + 2.5}Z" />
	<rect class="line f-wood" x={x1} {y} width={x2 - x1} height="3" rx="1" />
	<rect class="light" x={x1 + 1} y={y + 0.6} width={x2 - x1 - 2} height="0.9" />
{/snippet}

<!-- A jar, the middle of its bottom at (x, base). -->
{#snippet jar(x: number, base: number, w: number, h: number, tone: Tone)}
	{@const left = x - w / 2}
	{@const right = x + w / 2}
	{@const top = base - h}
	<path
		class="line tone-{tone}"
		d="M{left + 1.5} {base}Q{left} {base} {left} {base - 1.5}V{top + 2.5}Q{left} {top + 1} {left +
			1.5} {top + 0.5}H{right - 1.5}Q{right} {top + 1} {right} {top + 2.5}V{base -
			1.5}Q{right} {base} {right - 1.5} {base}Z"
	/>
	<rect class="line thin f-white" x={left} y={base - h * 0.62} width={w} height={h * 0.3} />
	<rect class="light" x={left + 1.1} y={top + 2.5} width="1" height={h - 4.5} rx="0.5" />
	<rect class="line f-wood" x={left + 0.6} y={top - 2} width={w - 1.2} height="2.8" rx="0.8" />
{/snippet}

<!-- A white plate on a table, its middle at (x, y). -->
{#snippet plate(x: number, y: number, rx: number, ry: number)}
	<ellipse class="shade" cx={x + 1} cy={y + 1.2} {rx} {ry} />
	<ellipse class="line f-white" cx={x} cy={y} {rx} {ry} />
	<ellipse class="line thin open" cx={x} cy={y + ry * 0.08} rx={rx * 0.66} ry={ry * 0.6} />
	<path
		class="shade"
		d="M{x - rx * 0.62} {y + ry * 0.1}A{rx * 0.66} {ry * 0.6} 0 0 0 {x + rx * 0.62} {y +
			ry * 0.1}Q{x} {y + ry * 0.2} {x - rx * 0.62} {y + ry * 0.1}Z"
	/>
{/snippet}

<!-- A tablecloth over a table whose top runs from `y` to `y + depth`. -->
{#snippet table(y: number, depth: number)}
	<rect class="line f-cloth" x="-2" {y} width={WIDTH + 4} height={HEIGHT} />
	<rect class="light" x="-2" {y} width={WIDTH + 4} height={depth} />
	<rect class="shade" x="-2" y={y + depth} width={WIDTH + 4} height={HEIGHT} />
	<path class="stripe" d="M-2 {y + depth + 4}H{WIDTH + 2}M-2 {y + depth + 7}H{WIDTH + 2}" />
	<path
		class="line thin open"
		d="M24 {y + depth}Q22 {y + depth + 12} 25 {HEIGHT}M70 {y + depth}Q72 {y +
			depth +
			12} 68 {HEIGHT}M118 {y + depth}Q115 {y + depth + 12} 119 {HEIGHT}"
	/>
	<path class="line open" d="M-2 {y + depth}H{WIDTH + 2}" />
{/snippet}

{#snippet fork(x: number, y: number, angle: number)}
	<g transform="translate({x} {y}) rotate({angle})">
		<path class="line f-metal" d={FORK} />
		<path class="light" d="M-0.5 6Q-0.7 -2 -0.2 -10L0.2 -10Q-0.1 -2 0.1 6Z" />
	</g>
{/snippet}

<!-- The chef's hat, the middle of the bottom of its band at (0, 0). -->
{#snippet toque(id: string)}
	{@render modeled(`${id}-puff`, TOQUE_PUFF, 'f-white', TOQUE_SHADE, TOQUE_LIGHT, false)}
	<path class="line thin open" d="M-5 -6.5C-6 -11 -5.5 -15 -4 -18.5M5 -6.5C6 -11 5.5 -15 3.5 -19" />
	{@render modeled(`${id}-band`, TOQUE_BAND, 'f-white', TOQUE_SHADE, '', false)}
{/snippet}

<!-- The toast, the middle of its bottom edge at (0, 0). -->
{#snippet toast(id: string, mood: ToastMood)}
	<path class="line f-crust" d={limb([-7, -3], [-7.5, 2], [-8, 6], 1.6, 1.4)} />
	<path class="line f-crust" d={limb([7, -3], [7.5, 2], [8, 6], 1.6, 1.4)} />
	{@render shoe(-8, 7, -1)}
	{@render shoe(8, 7, 1)}
	{#if mood === 'stern'}
		<path class="line f-crust" d={limb([-16, -22], [-31, -20], [-20.5, -10.5], 2.2, 1.8)} />
		<path class="line f-crust" d={limb([16, -22], [31, -21], [27.5, -32], 2.2, 1.8)} />
	{:else}
		<path class="line f-crust" d={limb([-16, -20], [-25, -15], [-23, -6], 2.2, 1.8)} />
		<path class="line f-crust" d={limb([16, -24], [33, -31], [25.5, -40], 2.2, 1.8)} />
	{/if}
	<clipPath id="{uid}-{id}"><path d={TOAST_BODY} /></clipPath>
	<path class="f-crust" d={TOAST_BODY} />
	<path class="f-crumb" d={TOAST_CRUMB} />
	<path class="line thin open" d={TOAST_CRUMB} />
	{#each TOAST_PORES as pore (pore.join(' '))}
		<ellipse class="f-pore" cx={pore[0]} cy={pore[1]} rx="1" ry="0.7" />
	{/each}
	<g clip-path="url(#{uid}-{id})">
		<path class="shade" d={TOAST_SHADE} />
		<path class="light" d={TOAST_LIGHT} />
	</g>
	<path class="line bold open" d={TOAST_BODY} />
	{#if mood === 'stern'}
		{@render eye(-6.5, -26, 3.6, 0.5, 0.9)}
		{@render eye(6.5, -26, 3.6, 0.5, 0.9)}
		<path class="line f-crumb" d={lidPath(-6.5, -26, 3.6, 0.6)} />
		<path class="line f-crumb" d={lidPath(6.5, -26, 3.6, 0.6)} />
		<path class="line bold open" d="M-11.5 -33Q-7.5 -34 -3 -31.2M3 -31.2Q7.5 -34 11.5 -33" />
		<path class="line bold open" d="M-4.5 -16.8Q0 -17.6 4.5 -16.8" />
		<path class="line thin open" d="M-5.8 -15.4Q-5 -16.2 -4.4 -16.6" />
	{:else}
		{@render eye(-6.5, -26, 3.6, 1.4, 0.2)}
		{@render eye(6.5, -26, 3.6, 1.4, 0.2)}
		<path class="line bold open" d="M-11 -32.5Q-7 -37.5 -2.5 -33.5M3 -31.5L11 -30.8" />
		<path class="line bold open" d="M-3.5 -16.5Q0.5 -15.5 4.5 -18" />
	{/if}
	<g transform="translate(1.5 -46) rotate(8)">{@render toque(`${id}-toque`)}</g>
	{#if mood === 'stern'}
		<path
			class="line f-wood"
			d="M26.4 -24.5Q26.2 -40 26.7 -52H28.5Q28.9 -40 28.7 -24.5A1.15 1.15 0 0 1 26.4 -24.5Z"
		/>
		<ellipse class="line f-wood" cx="27.6" cy="-57" rx="3.6" ry="5.4" />
		<ellipse class="shade" cx="28.4" cy="-56.2" rx="2" ry="3.6" />
		{@render hand(-20.5, -10.5, -36, 'f-crust', 1)}
		{@render hand(27.5, -32, 167, 'f-crust', -1)}
	{:else}
		{@render hand(-23, -6, -10, 'f-crust', 1)}
		{@render hand(25.5, -40, 144, 'f-crust', -1)}
	{/if}
{/snippet}

<!-- A jelly that wonders, the middle of its bottom at (0, 0). -->
{#snippet jelly()}
	<path class="line f-jelly" d={limb([-12, -9], [-22, -1], [-6, -3.5], 1.8, 1.5)} />
	{@render modeled(
		'jelly',
		'M-14 0C-15.5 0 -16 -1.5 -15.5 -3L-13 -15C-12 -22 -7 -25 0 -25C7 -25 12 -22 13 -15L15.5 -3C16 -1.5 15.5 0 14 0Z',
		'f-jelly',
		'M5 -27C11 -16 12 -6 8 2H20V-27Z',
		'M-11 -5C-10.5 -11 -9.5 -17 -7 -21C-8.5 -15 -9 -9 -9 -5Z',
		true
	)}
	<path class="line thin open" d="M-7.5 -1C-8.5 -8 -7.5 -16 -5 -23M7.5 -1C8.5 -8 7.5 -16 5 -23" />
	<circle class="line f-cherry" cx="0" cy="-27.5" r="2.6" />
	<circle class="light" cx="-0.8" cy="-28.4" r="0.8" />
	{@render eye(-5, -14, 2.9, -1.2, 0)}
	{@render eye(5, -14, 2.9, -1.2, 0)}
	<path class="line bold open" d="M-8.5 -18.6L-2.5 -18.2M2 -19.4Q5 -22.5 8.5 -19.8" />
	<path class="line bold open" d="M-3.5 -7.4Q-1 -6.4 1 -7.4Q2.6 -8.2 3.8 -7.6" />
	{@render hand(-6, -3.5, 180, 'f-jelly', 1)}
{/snippet}

<!-- A musical note, its head at (x, y), its stem drawn crooked. -->
{#snippet note(x: number, y: number, tone: Tone, stem: string)}
	<path class="line bold open" d={stem} />
	<ellipse
		class="line tone-{tone}"
		cx={x}
		cy={y}
		rx="3.4"
		ry="2.6"
		transform="rotate(-22 {x} {y})"
	/>
	<ellipse
		class="light"
		cx={x - 1}
		cy={y - 0.8}
		rx="1.2"
		ry="0.6"
		transform="rotate(-22 {x} {y})"
	/>
{/snippet}

{#if art === 'kitchen-opening'}
	<g data-story-art="kitchen-opening">
		{@render wall(28, 64)}
		{@render shelf(4, 42, 22)}
		{@render jar(12, 22, 7, 9, 'c')}
		{@render jar(22, 22, 6, 7, 'e')}
		{@render jar(33, 22, 8, 11, 'a')}
		{@render shelf(118, 156, 22)}
		{@render jar(127, 22, 8, 10, 'b')}
		{@render jar(138, 22, 6, 7, 'g')}
		{@render jar(148, 22, 7, 9, 'h')}
		<StoryDino {...OPENING_DINO} />
		<g transform={dinoFrame(OPENING_DINO)}>
			{@render modeled(
				'napkin',
				NAPKIN,
				'f-white',
				'M66 72Q74 88 62 106H100V60H66Z',
				'M44 78C45 88 50 95 55 99C50 92 47 86 46.5 78Z',
				false
			)}
			<path class="line thin open" d="M50 80Q52 90 58 99M70 80Q68 90 62 99" />
		</g>
		<path
			class="f-water line thin"
			d="M86 41C85.5 43 85 44.5 86 45.4C87 46.2 88.2 45 87.3 43.4C86.9 42.6 86.4 41.8 86 41Z"
		/>
		{@render fork(dinoGrip(OPENING_DINO)[0], dinoGrip(OPENING_DINO)[1], -4)}
		{@render table(64, 14)}
		<path
			class="line f-wood"
			d="M22.5 72C22 68 24 64 23.5 59C23 56 24.5 54.5 26 54.5C27.5 54.5 29 56 28.5 59C28 64 30 68 29.5 72Z"
		/>
		<circle class="line f-dark" cx="26" cy="53.6" r="1.6" />
		<path class="line thin open" d="M23.6 62.5Q26 63.6 28.4 62.5" />
		<path
			class="shade"
			d="M27 56C28 61 28.8 66 28.6 71.5H29.4C30 68 28 64 28.5 59C28.8 57 28 55.5 27 56Z"
		/>
		{@render plate(80, 72, 18, 4.6)}
		<path class="line f-wood" d="M95.5 77.6Q94 77.8 94.6 76.6L100.6 74.2L102 75.8Z" />
		<path class="line f-metal" d="M100.6 74.2L111 70.4Q113.6 69.6 113 71.2L102 75.8Z" />
		<path class="shade" d="M120 73.4H130.5Q131 74.4 129.5 74.6H120.5Z" />
		<path
			class="line glass f-white"
			d="M117 56H131L129.4 71Q129.2 72.4 127.8 72.4H120.2Q118.8 72.4 118.6 71Z"
		/>
		<path
			class="f-water"
			d="M117.6 61.5H130.4L129.4 71Q129.2 72.4 127.8 72.4H120.2Q118.8 72.4 118.6 71Z"
		/>
		<ellipse class="line thin f-water" cx="124" cy="61.5" rx="6.4" ry="1" />
		<path class="light" d="M118.8 58H120.2L121 70H120Z" />
		<path
			class="line open"
			d="M117 56H131L129.4 71Q129.2 72.4 127.8 72.4H120.2Q118.8 72.4 118.6 71Z"
		/>
	</g>
{:else if art === 'kitchen-toast'}
	<g data-story-art="kitchen-toast">
		{@render wall(34, 80)}
		{@render shelf(112, 156, 34)}
		{@render jar(121, 34, 8, 10, 'e')}
		{@render jar(133, 34, 7, 8, 'a')}
		{@render jar(146, 34, 9, 12, 'c')}
		{@render counter(80)}
		<path class="line f-crumb" d="M17 64C17 60 18 58.5 21 58.5H27C30 58.5 31 60 31 64Z" />
		<path class="line thin open" d="M20 61.5Q24 60.5 28 61.5" />
		<path class="line f-dark" d={limb([42, 70], [46, 69.5], [48.5, 70.5], 1.1, 1.1)} />
		{@render modeled(
			'toaster',
			'M7 82C5 82 4 80.5 4 78.5V69C4 65.5 6.5 63.5 10 63.5H38C41.5 63.5 44 65.5 44 69V78.5C44 80.5 43 82 41 82Z',
			'f-metal',
			'M30 60C36 66 36 76 30 86H50V60Z',
			'M7 77V69.5C7 67.5 8.2 66.5 10 66.5H14C11 67 9.5 68.5 9.5 70.5V77Z',
			false
		)}
		<rect class="line f-dark" x="12" y="62.5" width="24" height="2.4" rx="1.2" />
		<path class="line thin open" d="M4.5 74.5H43.5" />
		<circle class="line f-dark" cx="39" cy="78.2" r="1.3" />
		<ellipse class="shade" cx="80" cy="83.6" rx="30" ry="1.6" />
		{@render modeled(
			'board',
			'M52 83.5C50 83.5 49 82.5 49 81.5C49 80.3 50 79.6 52 79.6H104C106 79.6 108 80.2 110 80.6C112 81 113 81.5 113 82C113 82.8 111 83.5 108 83.5Z',
			'f-wood',
			'M49 82H114V86H49Z',
			'M52 80.4H100V81H52Z',
			false
		)}
		<ellipse class="line f-wall" cx="108.6" cy="81.6" rx="1.6" ry="0.7" />
		<g transform="translate(78 71) scale(0.86)">{@render toast('toast', 'stern')}</g>
	</g>
{:else if art === 'kitchen-cake'}
	<g data-story-art="kitchen-cake">
		{@render wall(54, 86)}
		<rect class="shade" y={CEILING} width={WIDTH} height="4" />
		{@render shelf(124, 158, 42)}
		{@render jar(133, 42, 8, 10, 'b')}
		{@render jar(146, 42, 7, 8, 'g')}
		{@render counter(86)}
		<path class="line open" d="M30 {CEILING}V20" />
		{@render modeled(
			'lamp',
			'M21.5 28.5C21.5 22.5 25.5 19.5 30 19.5C34.5 19.5 38.5 22.5 38.5 28.5Z',
			'tone-b',
			'M32 17C36 21 37 25 35 30H42V17Z',
			'M24 27C24 24 25.5 22 28 21C26.5 23 26 25 26 27Z',
			false
		)}
		<path class="line tone-c" d="M27 28.5A3 2.6 0 0 0 33 28.5Z" />
		<ellipse class="shade" cx="70" cy="87.6" rx="31" ry="2.2" />
		<path class="line f-white" d="M38 85.2A30 2.6 0 0 0 98 85.2V86.2A30 2.6 0 0 1 38 86.2Z" />
		<ellipse class="line f-white" cx="68" cy="85.2" rx="30" ry="2.6" />
		{#each TIER_SHAPES as tier, i (tier.bottom)}
			{@render modeled(`tier-${i}`, tier.path, tier.sponge, tier.shade, '', false)}
			<path class="line f-white" d={tier.cream} />
			<path
				class="light"
				d="M{r(spineX(tier.top) - tier.w * 0.8)} {tier.top + 0.6}Q{r(
					spineX(tier.top) - tier.w * 0.5
				)} {tier.top - 1.4} {r(spineX(tier.top) - tier.w * 0.15)} {tier.top - 1.6}Q{r(
					spineX(tier.top) - tier.w * 0.5
				)} {tier.top - 0.4} {r(spineX(tier.top) - tier.w * 0.8)} {tier.top + 0.6}Z"
			/>
		{/each}
		{@render modeled(
			'squash',
			SQUASHED_TIER,
			'f-pink',
			`M${r(squashX + 8)} 4C${r(squashX + 20)} 12 ${r(squashX + 18)} 20 ${r(squashX + 6)} 28H${r(squashX + 40)}V4Z`,
			'',
			false
		)}
		<path class="line f-white" d={SPLAT} />
		<rect class="line f-rock" x="-2" y="-2" width={WIDTH + 4} height={CEILING + 2} />
		<rect class="shade" x="-2" y={CEILING - 2} width={WIDTH + 4} height="2" />
		<path class="line thin open" d={CRACKS} />
		{@render eye(61.5, 77.5, 2.8, -0.3, -1.2)}
		{@render eye(74.5, 77.5, 2.8, -0.3, -1.2)}
		<path class="line bold open" d="M57.5 73.8Q60.5 72.4 64 73.4M71.5 73.4Q75 72.4 78 73.8" />
		<path
			class="line f-ink"
			d="M66.4 81.6Q68 80.2 69.6 81.6Q69.4 83.4 68 83.4Q66.6 83.4 66.4 81.6Z"
		/>
		<path class="line bold open" d="M36 84.5Q36.5 79 40.5 76.8" />
		<path class="line tone-e" d="M40.5 76.8C42 75 45 75.2 46 76.6C44.5 78 42 78.2 40.5 76.8Z" />
		{@render modeled(
			'cherry',
			'M36 81.6A3.6 3.6 0 1 1 35.9 81.6Z',
			'f-cherry',
			'M37.5 80C41 82 41 87 37 90H44V80Z',
			'M33.6 83.4A1.2 0.8 -30 1 1 33.7 83.4Z',
			false
		)}
		<circle class="f-ink" cx="34.6" cy="84.6" r="0.55" />
		<circle class="f-ink" cx="37.2" cy="84.6" r="0.55" />
		<ellipse class="f-ink" cx="36" cy="86.6" rx="0.6" ry="0.75" />
	</g>
{:else if art === 'kitchen-quiche'}
	<g data-story-art="kitchen-quiche">
		{@render wall(46, 84)}
		{@render shelf(58, 104, 22)}
		{@render jar(67, 22, 7, 9, 'h')}
		{@render jar(79, 22, 8, 11, 'g')}
		{@render jar(95, 22, 7, 8, 'b')}
		{@render counter(84)}
		<ellipse class="shade" cx="26" cy="87.2" rx="12" ry="1.3" />
		<g transform="translate(25 81.2) scale(0.56)">{@render toast('toast', 'puzzled')}</g>
		{@render plate(80, 86, 34, 3.6)}
		<g transform="translate(80 69) rotate(-11 -26 15)">
			<path class="line f-crust" d={limb([-24, 5], [-35, 4], [-37, 11], 2, 1.7)} />
			<path class="line f-crust" d={limb([24, 3], [35, 2], [37.5, -7], 2, 1.7)} />
			{@render modeled(
				'quiche-side',
				QUICHE_SIDE,
				'f-crust',
				'M10 -4C16 6 14 14 8 24H34V-4Z',
				'',
				false
			)}
			<path class="line thin open" d={QUICHE_FLUTES} />
			<path class="line f-crust" d={QUICHE_RIM} />
			<ellipse class="light" cx="-12" cy="-8" rx="9" ry="1.4" transform="rotate(-12 -12 -8)" />
			<clipPath id="{uid}-filling"><ellipse cx="0" cy="0.3" rx="23.5" ry="9.4" /></clipPath>
			<ellipse class="f-filling" cx="0" cy="0.3" rx="23.5" ry="9.4" />
			<g clip-path="url(#{uid}-filling)">
				<ellipse class="shade" cx="3" cy="-6" rx="25" ry="5" />
				<ellipse class="light" cx="-10" cy="5" rx="9" ry="3" />
			</g>
			<ellipse class="line thin open" cx="0" cy="0.3" rx="23.5" ry="9.4" />
			<path class="line thin f-leaf" d="M-18 -3Q-16 -5.5 -13.5 -4.5Q-15.5 -2.5 -18 -3Z" />
			<path class="line thin f-leaf" d="M15 -5Q17.5 -6.5 19.5 -4.6Q17 -3.4 15 -5Z" />
			<circle class="line thin f-spot" cx="-17" cy="3.5" r="1.3" />
			<circle class="line thin f-spot" cx="17" cy="3.2" r="1.3" />
			<circle class="line thin f-spot" cx="0.5" cy="-6.5" r="1.1" />
			<path class="line bold open" d="M-12 -2Q-8.5 -6.5 -5 -2M5 -2Q8.5 -6.5 12 -2" />
			<clipPath id="{uid}-mouth"><path d={QUICHE_MOUTH} /></clipPath>
			<path class="f-ink" d={QUICHE_MOUTH} />
			<g clip-path="url(#{uid}-mouth)">
				<ellipse class="tone-f" cx="1" cy="7.6" rx="4" ry="2.6" />
				<path class="f-white" d="M-7 0H7L6.6 2.2Q0 3.4 -6.6 2.2Z" />
			</g>
			<path class="line open" d={QUICHE_MOUTH} />
			<path
				class="line f-water"
				d="M-12.6 -1.6C-15.4 -1 -17 1.4 -16 3.2C-15 4.8 -12.6 4.2 -12.4 2.2C-12.3 0.8 -12.5 -0.4 -12.6 -1.6Z"
			/>
			<path
				class="line f-water"
				d="M12.6 -1.6C15.4 -1 17 1.4 16 3.2C15 4.8 12.6 4.2 12.4 2.2C12.3 0.8 12.5 -0.4 12.6 -1.6Z"
			/>
			{@render hand(-37, 11, 8, 'f-crust', -1)}
			{@render hand(37.5, -7, 170, 'f-crust', 1)}
		</g>
		<ellipse class="shade" cx="137" cy="87.2" rx="16" ry="1.4" />
		{@render plate(136, 85.6, 17, 2.6)}
		<g transform="translate(137 85)">{@render jelly()}</g>
	</g>
{:else if art === 'kitchen-pan'}
	<g data-story-art="kitchen-pan">
		{@render wall(36, 80)}
		{@render shelf(4, 46, 22)}
		{@render jar(13, 22, 7, 9, 'e')}
		{@render jar(25, 22, 8, 11, 'j')}
		{@render jar(37, 22, 7, 8, 'c')}
		<g transform="translate({CHEF_X} 0)">
			<path class="line f-white" d={limb([-14, 67], [-31, 59], [-13.5, 43], 4, 3.2)} />
			<path class="line f-white" d={limb([14, 67], [31, 59], [13.5, 43], 4, 3.2)} />
			{@render modeled('chef', CHEF_TORSO, 'f-white', 'M8 56C18 66 18 84 14 104H30V56Z', '', true)}
			<path class="line tone-b" d="M-9 70.5Q0 71.5 9 70.5L10 100H-10Z" />
			<path class="line thin open" d="M-8.5 70.6L-12 61.5M8.5 70.6L12 61.5" />
			{#each [-14.5, 14.5] as column (column)}
				<circle class="line thin f-white" cx={column} cy="70" r="1.1" />
				<circle class="line thin f-white" cx={column} cy="76" r="1.1" />
			{/each}
			{@render modeled(
				'chef-head',
				CHEF_HEAD,
				'f-skin',
				'M4 24C12 34 12 46 4 56H16V24Z',
				'M-9 34C-8 31 -6 29.5 -3.5 29C-5.5 31 -7 33 -7.5 36Z',
				true
			)}
			<path class="line tone-a" d="M-8 57.5Q0 62 8 57.5L5.5 63.5Q0 66.5 -5.5 63.5Z" />
			<g transform="translate(0 31)">{@render toque('chef-toque')}</g>
			<path class="line bold open" d="M-6 37.8L-2.8 40L-6 42.2M6 37.8L2.8 40L6 42.2" />
			<path class="line bold open" d="M-9 34.5Q-6.5 32.6 -3 33.2M3 33.2Q6.5 32.6 9 34.5" />
			<path class="line f-white" d="M-5.5 46.5Q0 44.5 5.5 46.5Q6 50 0 50.2Q-6 50 -5.5 46.5Z" />
			<path
				class="line thin open"
				d="M-5.4 48.2Q0 47.2 5.6 48.2M-2.5 45.6V49.8M0 45.3V50.1M2.5 45.6V49.8"
			/>
			<path class="line thin f-water" d="M8 33C6.2 35.4 6.3 37.3 7.8 37.7C9.3 38 10 36.4 8 33Z" />
			{@render hand(-13.5, 43, 192, 'f-skin', 1, 1.25)}
			{@render hand(13.5, 43, 168, 'f-skin', -1, 1.25)}
		</g>
		{@render counter(80)}
		<ellipse class="line f-dark" cx="46" cy="82" rx="22" ry="1.8" />
		<path class="line tone-b" d="M24 82.2C23 80 24.5 78 25.5 76.5C26 78.5 27.8 79.5 27.5 82.2Z" />
		<path class="line tone-b" d="M64.5 82.2C64.2 79.5 66 78.5 66.5 76.5C67.5 78 69 80 68 82.2Z" />
		<path
			class="line f-wood"
			d="M22 54L8 51.5C3 50.5 1 52.2 1.2 54.4C1.5 56.8 3.6 57.6 8 57L22 60Z"
		/>
		<circle class="line f-wall" cx="5" cy="54.3" r="1.1" />
		{@render modeled(
			'pan',
			PAN_BODY,
			'f-copper',
			'M58 40C68 52 68 70 60 84H76V40Z',
			'M25 52C25 62 26 70 28.5 75C29.5 70 28.5 62 28.5 52Z',
			true
		)}
		<path class="line f-metal" d="M19.6 54.5Q19.4 57.5 21 59.5L24.5 59.2Q23.6 56.8 23.8 54.2Z" />
		<ellipse class="line f-metal" cx="46" cy="48" rx="26.5" ry="4.6" />
		<ellipse class="line f-pot-inside" cx="46" cy="48.4" rx="23" ry="3.2" />
		<path class="steam" d="M60 46C58 41 63 39 61 34M67 46.5C66 42 70 40 68.5 36" />
		<g transform="rotate(-15 20 48)">
			<g transform="translate(20 48)">
				<path class="line f-dark" d="M23.8 -7.6Q24 -10 23 -11.5H30Q29 -10 29.2 -7.6Z" />
				<ellipse class="line f-dark" cx="26.5" cy="-12.2" rx="4.2" ry="1.8" />
				{@render modeled(
					'lid',
					PAN_LID,
					'f-copper',
					'M36 -12C42 -6 42 0 38 4H56V-12Z',
					'M6 -2.5C10 -5 16 -6.5 22 -7C16 -5.5 11 -3.5 8 -1.5Z',
					false
				)}
			</g>
		</g>
		<path class="line bold open" d="M31.5 55Q35.5 52 40 54M52 54Q56.5 52 60.5 55" />
		<path class="line bold open" d="M32 60.5Q36 57 40 60.5M52 60.5Q56 57 60 60.5" />
		<ellipse class="glassy tone-f" cx="30" cy="66" rx="3.4" ry="2" />
		<ellipse class="glassy tone-f" cx="62" cy="66" rx="3.4" ry="2" />
		<path class="line thin glassy tone-d" d={SONG} />
		<clipPath id="{uid}-singing"><path d={PAN_MOUTH} /></clipPath>
		<path class="f-ink" d={PAN_MOUTH} />
		<g clip-path="url(#{uid}-singing)">
			<ellipse class="tone-f" cx="47" cy="75" rx="4.4" ry="2.8" />
		</g>
		<path class="line open" d={PAN_MOUTH} />
		{@render note(77, 65, 'a', 'M80 64C80.5 60 78.8 57.5 81.2 53.5C83.5 54 85.5 55.5 85 58.5')}
		{@render note(88, 54, 'i', 'M91 53C91.4 49 90 47 91.5 43.5M91.5 43.5L95 41L97 44L100.5 39.5')}
		{@render note(97.5, 45, 'c', 'M100.5 44C101 42 100.2 41 100.5 39.5')}
		{@render note(109, 33.5, 'e', 'M112 32.5C112.5 28.5 115 25.5 118 27')}
	</g>
{:else if art === 'kitchen-spices'}
	<g data-story-art="kitchen-spices">
		{@render wall(34, 74)}
		<StoryDino {...SPICES_DINO} mood="cheer" />
		{@render counter(74)}
		<ellipse class="shade" cx="66" cy="77.8" rx="12" ry="1.2" />
		{@render modeled(
			'shaker',
			'M60 69.5H72Q74 69.5 74 71.5V75.5Q74 77.5 72 77.5H60Z',
			'tone-j',
			'M54 75H76V80H54Z',
			'M61 71H72.4Q73 71 73 71.6H61Z',
			false
		)}
		<rect class="line thin f-white" x="64" y="69.5" width="4" height="8" />
		<path
			class="line f-metal"
			d="M60.4 69.6C57 69.6 55.2 71.4 55.2 73.5C55.2 75.6 57 77.4 60.4 77.4Z"
		/>
		<circle class="f-ink" cx="57.6" cy="72" r="0.55" />
		<circle class="f-ink" cx="57" cy="74" r="0.55" />
		<circle class="f-ink" cx="57.6" cy="76" r="0.55" />
		<path
			class="line thin tone-g"
			d="M45.5 77.8Q47.5 74.8 50.5 75.4Q52.5 74.6 54 76.2Q55 77.6 53.5 78Z"
		/>
		{@render modeled(
			'sneeze',
			'M46.5 49C52 42 58 38 64 37C66 30 74 26 81 28C85 20 96 17 103 21C109 13 122 12 128 18C135 11 150 12 154 20C162 20 166 30 162 38L170 40V72C160 76 150 70 146 68C140 74 128 74 124 68C118 74 106 72 104 66C98 70 88 68 86 63C80 66 70 63 70 58C64 60 56 58 53 55.5C51 54.5 49 53.5 46.5 52.5Z',
			'f-cloud',
			'M40 60C70 58 100 66 130 62C145 60 160 60 170 58V80H40Z',
			'M66 39C68 33 74 30 79 31C75 33 71 36 69 40ZM105 23C110 17 118 16 124 19C118 19 113 21 109 25Z',
			false
		)}
		{#each SNEEZE_SPARKS as spark (`${spark.x} ${spark.y}`)}
			<path
				class="line tone-{spark.tone}"
				d={spark.star
					? starPath(spark.x, spark.y, spark.r, spark.r * STAR_INNER, 5)
					: twinkle(spark.x, spark.y, spark.r)}
			/>
		{/each}
		{#each SNEEZE_DOTS as dot (`${dot.x} ${dot.y}`)}
			<circle class="line thin tone-{dot.tone}" cx={dot.x} cy={dot.y} r="1.5" />
		{/each}
	</g>
{:else if art === 'kitchen-ending'}
	<g data-story-art="kitchen-ending">
		{@render wall(30, 64)}
		{@render shelf(102, 156, 30)}
		{@render jar(112, 30, 7, 9, 'a')}
		{@render jar(123, 30, 8, 11, 'c')}
		{@render jar(146, 30, 7, 8, 'e')}
		<circle class="line f-white" cx="132" cy="12.5" r="7.5" />
		<circle class="line thin open" cx="132" cy="12.5" r="5.6" />
		<path class="line open" d="M132 12.5V8.4M132 12.5L135.2 14.2" />
		<circle class="f-ink" cx="132" cy="12.5" r="0.8" />
		<StoryDino {...ENDING_DINO} />
		<g transform={dinoFrame(ENDING_DINO)}>
			{@render modeled(
				'belly',
				BELLY,
				'f-white',
				'M70 74C86 82 90 100 74 114H100V70Z',
				'M38 82C40 76 45 73 50 73C44 77 41 82 40 88Z',
				true
			)}
			<path class="line thin open" d="M48 84Q46 94 49 104M72 84Q74 94 71 104" />
			<path
				class="line f-sauce"
				d="M62 88C64 85 68 86 69 88C71.5 89 71 92 69 93C68.5 96 65 96 64 94.5C61 95 59.5 92 61 90.5C60.5 89.5 61 88.5 62 88Z"
			/>
		</g>
		{@render fork(dinoGrip(ENDING_DINO)[0], dinoGrip(ENDING_DINO)[1], -8)}
		{@render table(69, 10)}
		<circle class="line thin f-crumb" cx="60" cy="75" r="0.8" />
		<g transform="translate(0 5)">
			<ellipse class="shade" cx="79" cy="72.8" rx="12" ry="2.6" />
			{#each PLATE_STACK as level (level)}
				{@const top = 71 - level * PLATE_STEP}
				<path
					class="line f-white"
					d="M67 {top}A11 2.6 0 0 0 89 {top}V{top + 1.4}A11 2.6 0 0 1 67 {top + 1.4}Z"
				/>
				<ellipse class="line f-white" cx="78" cy={top} rx="11" ry="2.6" />
				<path
					class="shade"
					d="M80 {top + 2.5}A11 2.6 0 0 0 88.4 {top + 1.6}V{top + 2.4}A11 2.6 0 0 1 80 {top + 3.9}Z"
				/>
			{/each}
			<ellipse class="line thin open" cx="78" cy={71.2 - 4 * PLATE_STEP} rx="7" ry="1.5" />
			<circle class="line thin f-crumb" cx="75" cy="58.6" r="0.8" />
			<circle class="line thin f-crumb" cx="80.5" cy="58" r="0.7" />
		</g>
		<g transform="translate(0 3)">
			<path class="shade" d="M92 97.5L95 72L157 70L160 96Z" />
			<path
				class="line f-cover"
				d="M93 96L94.5 70.5Q94.6 69.5 95.6 69.5L155.4 68Q156.4 68 156.5 69L159 94.5Q159 95.5 158 95.5L94 97Q93 97 93 96Z"
			/>
			<path class="line f-page" d="M96.5 72Q111 68.8 125.5 71.5V94Q110 91.8 95 95Z" />
			<path class="line f-page" d="M125.5 71.5Q140 68.3 154 69.8L156.2 92.4Q141 90.8 125.5 94Z" />
			<path class="shade" d="M121 71.3Q123.5 71.4 125.5 71.5V94Q123 93.6 120.5 93.4Z" />
			<path
				class="writing"
				d="M99 76.5Q110 74 121 76M98.6 81Q110 78.5 121 80.5M98.2 85.5Q109 83 121 85M97.8 90Q105 88 113 89"
			/>
			<path
				class="writing"
				d="M129 75.5Q140 73 151.5 73.8M129 80Q140 77.5 152 78.3M129 84.5Q140 82 152.6 82.8M129 89Q140 86.5 153 87.3"
			/>
			<path
				class="line f-sauce"
				d="M134 78.5C136 74.6 141 75.6 142.5 77.5C145.5 76.5 148.5 79 147 82C150 84 148.5 88.5 145 88C144.6 91.5 142.6 92.6 141.4 91.2C140.4 92.8 137.4 92.8 137 90C133.5 90.6 131.5 87 133.5 85C130.5 83 131.5 79 134 78.5Z"
			/>
			<path class="light" d="M136 79.6C137.5 78 140 78 141 79.2C139.2 79.2 137.6 79.8 136.6 81Z" />
			<circle class="line thin f-sauce" cx="150.6" cy="77.6" r="1.1" />
			<circle class="line thin f-sauce" cx="131" cy="91.6" r="0.9" />
			<circle class="line thin f-sauce" cx="151.8" cy="89.4" r="0.8" />
		</g>
	</g>
{/if}

<style>
	.line {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: none;
	}

	.shade {
		fill: var(--dd-color-story-shade);
		fill-opacity: var(--dd-opacity-story-shade);
	}

	.light {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.glassy,
	.glass {
		fill-opacity: var(--dd-opacity-glass);
	}

	.grout {
		fill: none;
		stroke: var(--dd-color-story-page-edge);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.stripe {
		fill: none;
		stroke: var(--dd-color-story-white);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.steam {
		fill: none;
		stroke: var(--dd-color-pot-steam);
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.writing {
		fill: none;
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.f-wall {
		fill: var(--dd-color-story-sand);
	}

	.f-tile,
	.f-white {
		fill: var(--dd-color-story-white);
	}

	.f-wood {
		fill: var(--dd-color-story-wood);
	}

	.f-rock {
		fill: var(--dd-color-story-rock);
	}

	.f-metal {
		fill: var(--dd-color-story-metal);
	}

	.f-dark,
	.f-ink {
		fill: var(--dd-color-story-ink);
	}

	.f-water {
		fill: var(--dd-color-story-water);
	}

	.f-cloth {
		fill: var(--dd-color-story-a);
	}

	.f-sauce {
		fill: var(--dd-color-story-j);
	}

	.f-crust {
		fill: var(--dd-color-story-wood);
	}

	.f-crumb {
		fill: var(--dd-color-food-a);
	}

	.f-pore {
		fill: var(--dd-color-story-g);
	}

	.f-pink {
		fill: var(--dd-color-food-b);
	}

	.f-sponge {
		fill: var(--dd-color-food-c);
	}

	.f-cherry {
		fill: var(--dd-color-story-j);
	}

	.f-filling {
		fill: var(--dd-color-food-c);
	}

	.f-leaf {
		fill: var(--dd-color-story-leaf);
	}

	.f-spot {
		fill: var(--dd-color-story-spot);
	}

	.f-jelly {
		fill: var(--dd-color-story-f);
	}

	.f-skin {
		fill: var(--dd-color-story-spot);
	}

	.f-copper {
		fill: var(--dd-color-story-g);
	}

	.f-pot-inside {
		fill: var(--dd-color-pot-inside);
	}

	.f-cloud {
		fill: var(--dd-color-story-sky);
	}

	.f-cover {
		fill: var(--dd-color-story-h);
	}

	.f-page {
		fill: var(--dd-color-story-page);
	}

	.tone-a {
		fill: var(--dd-color-story-a);
	}

	.tone-b {
		fill: var(--dd-color-story-b);
	}

	.tone-c {
		fill: var(--dd-color-story-c);
	}

	.tone-d {
		fill: var(--dd-color-story-d);
	}

	.tone-e {
		fill: var(--dd-color-story-e);
	}

	.tone-f {
		fill: var(--dd-color-story-f);
	}

	.tone-g {
		fill: var(--dd-color-story-g);
	}

	.tone-h {
		fill: var(--dd-color-story-h);
	}

	.tone-i {
		fill: var(--dd-color-story-i);
	}

	.tone-j {
		fill: var(--dd-color-story-j);
	}

	.tone-m {
		fill: var(--dd-color-story-m);
	}

	.tone-o {
		fill: var(--dd-color-story-o);
	}
</style>
