<script lang="ts">
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.zoo`. */
		art: string;
	}

	const uid = $props.id();

	let { art }: Props = $props();

	/** [startX, startY, endX, endY, width, bow]: a curved band, see `bandPath` and `lensPath`. */
	type Band = readonly [number, number, number, number, number, number];
	/** [centreX, centreY, radius, turn in degrees]: a rounded patch of a coat, see `patchPath`. */
	type Patch = readonly [number, number, number, number];

	const PATCH_CORNERS = [1, 0.78, 0.96, 0.72, 0.92, 0.84];

	function formatNumber(value: number): string {
		return Number(value.toFixed(2)).toString();
	}

	function pointOf(x: number, y: number): string {
		return `${formatNumber(x)} ${formatNumber(y)}`;
	}

	/** Unit normal of the segment, and the middle of the segment pushed sideways by `bow`. */
	function frameBand([ax, ay, bx, by, , bow]: Band) {
		const length = Math.hypot(bx - ax, by - ay) || 1;
		const nx = -(by - ay) / length;
		const ny = (bx - ax) / length;
		return { nx, ny, mx: (ax + bx) / 2 + nx * bow, my: (ay + by) / 2 + ny * bow };
	}

	/** A stripe: `width` wide at its start, narrowing towards its rounded end, bent by `bow`. */
	function bandPath(band: Band): string {
		const [ax, ay, bx, by, width] = band;
		const { nx, ny, mx, my } = frameBand(band);
		const half = width / 2;
		const end = half * 0.35;
		return (
			`M${pointOf(ax + nx * half, ay + ny * half)}` +
			`Q${pointOf(mx + nx * half * 0.8, my + ny * half * 0.8)} ${pointOf(bx + nx * end, by + ny * end)}` +
			`L${pointOf(bx - nx * end, by - ny * end)}` +
			`Q${pointOf(mx - nx * half * 0.8, my - ny * half * 0.8)} ${pointOf(ax - nx * half, ay - ny * half)}Z`
		);
	}

	/** A lock of wool or a leaf: pointed at both ends, `width` thick in its middle. */
	function lensPath(band: Band): string {
		const [ax, ay, bx, by, width] = band;
		const { nx, ny, mx, my } = frameBand(band);
		return (
			`M${pointOf(ax, ay)}Q${pointOf(mx + nx * width, my + ny * width)} ${pointOf(bx, by)}` +
			`Q${pointOf(mx - nx * width, my - ny * width)} ${pointOf(ax, ay)}Z`
		);
	}

	/** An irregular hexagon with rounded corners: giraffe patches, cow spots. */
	function patchPath([cx, cy, radius, turn]: Patch): string {
		const count = PATCH_CORNERS.length;
		const cornerOf = (i: number): readonly [number, number] => {
			const reach = PATCH_CORNERS[i % count] ?? 1;
			const angle = ((turn + (i * 360) / count) * Math.PI) / 180;
			return [cx + Math.cos(angle) * radius * reach, cy + Math.sin(angle) * radius * reach];
		};
		const middleOf = (i: number): string => {
			const [x, y] = cornerOf(i);
			const [nextX, nextY] = cornerOf(i + 1);
			return pointOf((x + nextX) / 2, (y + nextY) / 2);
		};
		const curves = PATCH_CORNERS.map((_, i) => {
			const [x, y] = cornerOf(i);
			return `Q${pointOf(x, y)} ${middleOf(i)}`;
		});
		return `M${middleOf(count - 1)}${curves.join('')}Z`;
	}

	const bandsPath = (bands: readonly Band[]) => bands.map(bandPath).join('');
	const lensesPath = (bands: readonly Band[]) => bands.map(lensPath).join('');
	const patchesPath = (patches: readonly Patch[]) => patches.map(patchPath).join('');

	const clipOf = (name: string) => `zoo-${name}-${uid}`;

	// --- Zebra, standing, looking right; origin on the ground under its belly. ---
	const ZEBRA_BODY =
		'M20 -60C13 -56 7 -49 3 -41C-5 -41 -14 -40 -22 -40C-30 -40 -33 -33 -32 -27C-31 -21 -27 -18 -21 -19C-10 -17 4 -17 12 -20C18 -22 22 -27 22 -33C23 -42 27 -49 31 -53Z';
	const ZEBRA_HEAD =
		'M18 -60C18 -65 24 -67 28 -63C32 -59 37 -53 40 -49C42.5 -46 41 -41.5 37 -41.5C33 -42 30 -46 27 -49C23 -51 18 -54 18 -60Z';
	const ZEBRA_EAR = 'M19 -61C16 -66 15.5 -71 17.5 -74C20.5 -71 23 -66 23.5 -62Z';
	const ZEBRA_MANE =
		'M23 -66C20 -68 17.5 -66 16.4 -62.7C14 -62.5 12.5 -61 11.6 -59C9.5 -58.5 8 -56.5 7.5 -54.2C5.5 -53 4.5 -51 4.3 -48.4C3 -46.5 2.5 -44 2.8 -41.6L6 -42C9 -47 14 -53 21 -59Z';
	const ZEBRA_FRONT_LEG =
		'M6.5 -33C6 -24 7.5 -18 8.6 -14.5C9.4 -13 9.3 -11 9 -9C8.8 -6.5 8.8 -4.5 8.8 -2.5L12.6 -2.5C12.4 -5 12.3 -7.5 12.4 -9.5C12.4 -11.5 12.6 -13.5 13.2 -15C14.2 -18 15.2 -24 15.5 -33Z';
	const ZEBRA_FRONT_HOOF = 'M8.9 -3C8.6 -1.6 8.4 -0.6 8.5 0L13.4 0C13.3 -1 13 -2.2 12.7 -3Z';
	const ZEBRA_HIND_LEG =
		'M-31 -33C-31.5 -26 -30 -20.5 -28 -16C-26.6 -13 -26.2 -8 -26.2 -2.5L-22.4 -2.5C-22.4 -7 -22.6 -11 -22.4 -14C-21.8 -17 -18 -22 -15 -30Z';
	const ZEBRA_HIND_HOOF =
		'M-26.1 -3C-26.4 -1.6 -26.6 -0.6 -26.5 0L-21.6 0C-21.7 -1 -22 -2.2 -22.3 -3Z';
	/** The front leg held out, its hoof pointing at the ground ahead. */
	const ZEBRA_POINTING_LEG =
		'M7 -24C10 -18 16 -17 21 -17C24 -15 27 -12 29 -10L31.6 -12.6C29 -15 26 -18 23 -21C20 -23 17 -27 15 -30Z';
	const ZEBRA_POINTING_HOOF =
		'M28.7 -10.2L31.8 -12.8C33.5 -11.8 34.6 -10.5 34.4 -9.6C33.6 -8.6 32 -7.8 31.1 -7.9Z';
	const ZEBRA_TAIL_TUFT = 'M-37.5 -22C-40.5 -19 -40.5 -13 -38 -10C-35.5 -13 -35 -18 -37.5 -22Z';
	/** Neck stripes cross the neck, from beyond the mane to the throat. */
	const ZEBRA_NECK_AXIS = { x: 12, y: -36, dx: 13, dy: -22 } as const;
	const ZEBRA_NECK_STRIPES: Band[] = [0.08, 0.27, 0.46, 0.65, 0.84].map((t) => {
		const { x, y, dx, dy } = ZEBRA_NECK_AXIS;
		const length = Math.hypot(dx, dy);
		const [px, py] = [-dy / length, dx / length];
		const [cx, cy] = [x + dx * t, y + dy * t];
		return [cx - px * 17, cy - py * 17, cx + px * 9, cy + py * 9, 3.2, 1.2];
	});
	const ZEBRA_STRIPES = bandsPath([
		...ZEBRA_NECK_STRIPES,
		[2, -46, 3.5, -17, 4.2, -1.5],
		[-8, -46, -7, -16, 4.6, 0],
		[-15, -46, -14.5, -17, 4.2, 1],
		[-38, -41, -19, -35, 4.2, -2],
		[-38, -33, -18, -28, 4.4, -2],
		[-38, -25, -19, -21, 4, -1.5]
	]);
	const ZEBRA_FACE_STRIPES = bandsPath([
		[33, -57, 26.5, -50, 2.4, 0.6],
		[36.5, -53, 30.5, -46.5, 2.2, 0.6],
		[29, -63, 22.5, -55.5, 2.2, 0.6]
	]);
	const ZEBRA_LEG_STRIPES = lensesPath([
		[0, -24, 20, -23, 2.8, 0],
		[0, -18.5, 20, -18, 2.6, 0],
		[0, -13, 20, -12.8, 2.2, 0],
		[0, -7.5, 20, -7.4, 2, 0],
		[-36, -24, -12, -22, 2.8, 0],
		[-36, -18, -12, -16.5, 2.6, 0],
		[-36, -11.5, -12, -11, 2.2, 0],
		[-36, -6, -12, -6, 2, 0]
	]);
	const ZEBRA_POINTING_STRIPES = lensesPath([
		[14, -14, 20, -26, 2.6, 0],
		[20, -11, 26, -22, 2.4, 0],
		[25, -7, 31, -17, 2.2, 0]
	]);

	// --- Cow, dancing, looking right; origin on the ground under its belly. ---
	const COW_BODY =
		'M10 -42C0 -42 -12 -41 -22 -42C-27 -42 -30 -39 -30 -34C-30 -28 -28 -22 -24 -19C-14 -15 2 -15 12 -18C17 -19 20 -22 20 -27C22 -29 25 -32 28 -35C30 -38 30 -44 28 -48C22 -49 16 -46 10 -42Z';
	const COW_HEAD =
		'M24 -50C24 -56 30 -59 35 -57C38 -55.5 40 -52 42 -48C44 -45 46 -42 46 -39C46 -34.5 42 -32.5 38 -33C34 -33.5 30 -35 28 -38C25 -41 24 -45 24 -50Z';
	const COW_HORN = 'M27 -55C25.5 -59 26 -63 29.5 -65.5C29.2 -62 30 -59 31 -56Z';
	const COW_EAR = 'M26 -52C22 -55 18 -55 15.5 -53C18 -49.5 22 -49 26 -49.5Z';
	const COW_LEG =
		'M7 -22C7 -14 8 -11 9 -8.5C9 -6 9 -4.5 9 -3L13.5 -3C13.4 -4.5 13.3 -6.5 13.6 -8.5C14.5 -11.5 16 -16 16 -22Z';
	const COW_HOOF = 'M8.8 -3.4C8.5 -1.8 8.4 -0.7 8.6 0L14 0C14 -1.4 13.8 -2.5 13.6 -3.4Z';
	const COW_HIND_LEG =
		'M-29 -28C-29 -20 -27 -15 -26 -11C-25.5 -8 -25.5 -5 -25.5 -3L-21.2 -3C-21.2 -6 -21.2 -9 -20.8 -11C-19.5 -14 -16 -18 -14 -22Z';
	const COW_HIND_HOOF =
		'M-25.6 -3.4C-25.8 -1.8 -25.9 -0.7 -25.7 0L-20.4 0C-20.5 -1.4 -20.7 -2.5 -21 -3.4Z';
	/** The front leg lifted for a step of the dance. */
	const COW_DANCING_LEG =
		'M9 -21C14 -19 19 -19.5 22.5 -20.5C22.4 -18 22.6 -16 22.8 -13.5L26.8 -13.5C26.8 -16 27.2 -20 27 -23.5C25.5 -27.5 20 -29 15 -30Z';
	const COW_DANCING_HOOF =
		'M22.6 -13.8C22.4 -12.2 22.4 -11 22.6 -10.2L27.2 -10.2C27.3 -11.4 27.1 -12.6 26.9 -13.8Z';
	const COW_SPOTS = patchesPath([
		[-22, -40, 8, 10],
		[-6, -28, 6.5, 40],
		[8, -42, 5.5, 0],
		[-26, -24, 4, 20],
		[29, -50, 4, 15]
	]);

	// --- Giraffe head, looking left; origin at the top of its skull. ---
	const GIRAFFE_HEAD =
		'M7 -3C4 -7 -3 -7.5 -8 -5.5C-13 -3.5 -18 -1.5 -20.5 1.5C-22.5 4.5 -20.5 8.5 -16 8.5C-11 8.5 -6 8 -1 7.5C4 7 8.5 3.5 7 -3Z';
	const GIRAFFE_OSSICONE = 'M-0.5 -5C0 -8.5 0 -11 0.5 -13L2.8 -13C3 -11 3.2 -8.5 3.5 -5Z';
	const GIRAFFE_EAR = 'M4 -2C8 -6 13 -7.5 16.5 -6.5C13.5 -2.5 9 -0.5 5 1.5Z';
	const GIRAFFE_HEAD_PATCHES = patchesPath([
		[-7, -3.6, 2.2, 10],
		[0.5, 3.5, 2.4, 30],
		[4.5, -2, 1.8, 0],
		[-11, 0, 1.6, 20]
	]);

	// --- Giraffe, standing, looking left; origin on the ground under its belly. ---
	const GIRAFFE_BODY =
		'M-14 -66C-4 -64 10 -60 18 -57C24 -55 26 -50 24 -45C22 -41 18 -39 14 -40C4 -38 -6 -38 -14 -40C-20 -42 -22 -48 -21 -54C-22 -62 -26 -80 -30 -98L-31 -103C-28 -105 -25 -103 -24 -100C-21 -88 -18 -74 -14 -66Z';
	const GIRAFFE_MANE =
		'M-23 -103C-21 -95 -18 -83 -15 -74C-13 -70 -11 -67 -9 -65L-14 -66C-18 -74 -21 -88 -25 -101Z';
	const GIRAFFE_FRONT_LEG =
		'M-11 -44C-11 -34 -12 -26 -12.5 -21C-12.6 -14 -12.7 -7 -12.6 -2.5L-15.6 -2.5C-15.6 -7 -15.7 -14 -16 -21C-16.5 -26 -18 -34 -19 -44Z';
	const GIRAFFE_FRONT_HOOF =
		'M-12.5 -3C-12.3 -1.5 -12.2 -0.5 -12.3 0L-16.3 0C-16.2 -1 -16 -2 -15.8 -3Z';
	const GIRAFFE_HIND_LEG =
		'M24 -46C23 -38 21 -30 20 -23C19.5 -15 19.3 -8 19.3 -2.5L16.3 -2.5C16.3 -8 16.3 -15 16 -21C15 -28 12 -36 10 -42Z';
	const GIRAFFE_HIND_HOOF = 'M19.4 -3C19.6 -1.5 19.7 -0.5 19.6 0L15.6 0C15.7 -1 15.9 -2 16.1 -3Z';
	const GIRAFFE_PATCHES = patchesPath([
		[-27, -94, 3, 0],
		[-23, -86, 3.6, 30],
		[-25, -78, 3, 10],
		[-20, -76, 3.2, 40],
		[-22, -68, 3.6, 20],
		[-17, -62, 3.6, 0],
		[-19, -51, 4, 30],
		[-12, -55, 4, 10],
		[-6, -47, 4.4, 40],
		[-4, -58, 4, 20],
		[4, -52, 4.6, 0],
		[5, -43, 3.6, 30],
		[12, -56, 4, 15],
		[14, -47, 4.2, 40],
		[21, -51, 3.6, 10],
		[-14, -44, 3.4, 25]
	]);
	const GIRAFFE_LEG_PATCHES = patchesPath([
		[-15, -38, 2.4, 0],
		[-13.5, -31, 2, 30],
		[-15, -25, 1.8, 10],
		[18, -38, 2.4, 20],
		[17.5, -31, 2, 0],
		[17.6, -25, 1.8, 30]
	]);

	// --- The giraffe's neck coming down from the top of the picture, for `zoo-giraffe`. ---
	const LONG_NECK = 'M107 27C116 17 127 5 135 -8L170 -8C153 8 133 24 115 34Z';
	const LONG_MANE =
		'M106 25C110 21 113 17 117 13C120 9 124 5 127 0C129 -3 131 -6 132 -9L138 -8C130 5 120 17 111 28Z';
	const LONG_NECK_PATCHES = patchesPath([
		[118, 27, 3.6, 10],
		[124, 19, 4, 40],
		[131, 25, 3.4, 20],
		[131, 10, 4.6, 0],
		[139, 16, 4.4, 30],
		[142, 2, 5, 15],
		[150, 8, 5, 40],
		[156, -4, 5.4, 0],
		[163, 1, 5, 20],
		[139, -6, 4, 25]
	]);

	// --- Yak, looking left, drawn where it stands in `zoo-yak`. ---
	/** Tips of the locks along the fringe of the yak's wool, from its rump to its chest. */
	const YAK_HEM_TIPS = [
		[155, 88.5],
		[145.5, 91],
		[136, 89.5],
		[126.5, 91.5],
		[117, 90],
		[107.5, 91.5],
		[98, 90],
		[89, 89]
	] as const;
	const YAK_WOOL =
		'M88 34C90 24 98 18 108 18C118 18 126 22 136 24C148 26 156 32 158 42C160 52 159 66 158 80' +
		YAK_HEM_TIPS.map(
			([x, y]) =>
				`C${pointOf(x + 4, y - 3)} ${pointOf(x + 2, y - 0.5)} ${pointOf(x, y)}` +
				`C${pointOf(x - 1.2, y - 2)} ${pointOf(x - 3, y - 4.5)} ${pointOf(x - 5, y - 6)}`
		).join('') +
		'C78 78 77 66 81 58C84 50 86 42 88 34Z';
	const YAK_LEG = 'M-3 -6C-3 -3 -2.7 0 -2.6 2.5L2.6 2.5C2.7 0 3 -3 3 -6Z';
	const YAK_HOOF = 'M-2.8 2C-3 3.4 -3 4.4 -2.8 5L2.8 5C3 4.4 3 3.4 2.8 2Z';
	const YAK_HEAD =
		'M90 40C84 36 74 36 70 42C66 48 64 54 65 59C66 64 72 66.5 78 65.5C84 64.5 88 60 90 54Z';
	const YAK_NEAR_HORN =
		'M79 41C73 39.5 67 38.5 63.5 34C61 31 60.5 27 62.5 22.5C63.5 26.5 65 30 68 32.5C71 35 75 35.5 80 36Z';
	const YAK_FAR_HORN =
		'M82 39C86 36.5 89 33.5 90 29.5C91 26.5 91 23.5 90 20.5C92.5 23.5 94 27.5 93.5 31.5C93 35.5 89.5 39.5 86 42Z';
	const YAK_FRINGE =
		'M65.5 46.5C65 39 73 33 81 33.5C87 34 91 37 91 42C89.5 45 87 47 85.5 51C83.5 48.5 82 47 80.5 47C79.5 50 77.5 52 75 54C74.5 51 73 49 71.5 48.5C70 51 68 52 66 52C66 50 65.5 48 65.5 46.5Z';
	const YAK_BEARD =
		'M70 63C74 66 79 66 84 64C86 61 88 58 90 56C92 62 92 68 90 74C88 72 87 71 86 70C85 74 83 77 80 79C79.5 76 79 74 78 73C76 75 74 76 71 76C72 72 71.5 67 70 63Z';
	/** Darker locks hanging in the wool, and lighter ones over them. */
	const YAK_DARK_LOCKS = lensesPath([
		[100, 30, 95, 86, 2.4, -3],
		[113, 24, 109, 88, 2.6, -4],
		[127, 26, 123, 88, 2.6, -4],
		[141, 30, 137, 88, 2.6, -3.5],
		[153, 40, 151, 86, 2.2, -2.5],
		[90, 46, 86, 82, 2, -2]
	]);
	const YAK_LIGHT_LOCKS = lensesPath([
		[106, 22, 102, 60, 2, -2.5],
		[120, 22, 117, 64, 2.2, -3],
		[134, 26, 131, 66, 2.2, -3],
		[148, 32, 146, 64, 2, -2.5]
	]);
	const YAK_STRANDS =
		'M108 40C105 52 108 66 104 84M121 44C118 58 121 72 117 86M135 46C132 60 135 72 131 86M147 50C145 62 148 72 145 84M96 56C94 66 96 74 93 84';
	const CARROT_LEAVES = lensesPath([
		[-1, 0, -8, -5.5, 1.6, 0.6],
		[-1, 0, -9, 0.5, 1.6, -0.4],
		[-1, 0, -6.5, 5.5, 1.4, -0.6]
	]);
	const CARROT_TOP =
		'M-1.4 -2.4C2 -3.4 6 -1.6 9.5 1.6C6 2.6 2 3.4 -1.2 2.6C-2.4 1.6 -2.4 -1.4 -1.4 -2.4Z';

	// --- The notebook of the last page. ---
	/** Every signature: which print, where, how it is turned, in which ink. */
	const PRINTS = [
		{ kind: 'cloven', x: 46, y: 32, turn: 14, paint: 'tone-i' },
		{ kind: 'horse', x: 72, y: 28, turn: -12, paint: 'dark' },
		{ kind: 'long', x: 100, y: 34, turn: 20, paint: 'spot' },
		{ kind: 'wide', x: 52, y: 62, turn: -16, paint: 'tone-p' },
		{ kind: 'dino', x: 82, y: 60, turn: -8, paint: 'tone-k' },
		{ kind: 'cloven', x: 108, y: 66, turn: 24, paint: 'tone-j' }
	] as const;

	const PRINT_PATHS = {
		cloven:
			'M-1 -7.5C-6 -6.5 -7 0 -5.5 4.5C-4.5 7 -1.5 7 -1 4.5ZM1 -7.5C6 -6.5 7 0 5.5 4.5C4.5 7 1.5 7 1 4.5Z',
		long: 'M-1 -9.5C-5.5 -8 -6 1 -4.5 6C-3.5 8.5 -1.2 8.5 -1 5.5ZM1 -9.5C5.5 -8 6 1 4.5 6C3.5 8.5 1.2 8.5 1 5.5Z',
		wide: 'M-1.2 -6.5C-8 -6 -9 1 -6.5 5.5C-5 7.5 -1.5 7 -1.2 4ZM1.2 -6.5C8 -6 9 1 6.5 5.5C5 7.5 1.5 7 1.2 4Z',
		horse:
			'M-6 1C-6 -4.5 -3.2 -7.5 0 -7.5C3.2 -7.5 6 -4.5 6 1C6 5 3.5 7.5 1.6 7.5L0 5L-1.6 7.5C-3.5 7.5 -6 5 -6 1Z',
		dino: 'M0 8C-4 8 -6 5.5 -5.2 2.5C-6.8 0 -8.8 -3.5 -9.6 -7.5C-7 -6 -4.6 -4 -2.6 -2C-2.6 -5 -1.6 -9 0 -11.5C1.6 -9 2.6 -5 2.6 -2C4.6 -4 7 -6 9.6 -7.5C8.8 -3.5 6.8 0 5.2 2.5C6 5.5 4 8 0 8Z'
	} as const;
	/** The zebra signs with a striped hoof. */
	const HOOF_STRIPES = lensesPath([
		[-7, -3, 7, -4.6, 1.5, 0.6],
		[-7, 1.2, 7, -0.4, 1.7, 0.6],
		[-7, 5.4, 7, 3.8, 1.5, 0.6]
	]);
	/** Specks of ink around the prints, as [x, y, radius]. */
	const SPECKS = [
		[56, 27, 0.9],
		[38, 38, 0.7],
		[84, 24, 0.8],
		[111, 29, 0.7],
		[62, 70, 0.9],
		[94, 54, 0.7],
		[118, 74, 0.8]
	] as const;
	const RING_XS = [32, 44, 56, 68, 80, 92, 104, 116, 128];
	const RULE_YS = [22, 31, 40, 49, 58, 67, 76, 85];
	const STAR_TRAIL = [
		[120, 46, 2.2],
		[128, 38, 2.8],
		[137, 28, 3.4]
	] as const;

	function starPath(cx: number, cy: number, outer: number): string {
		const inner = outer * 0.45;
		const corners = Array.from({ length: 10 }, (_, i) => {
			const radius = i % 2 === 0 ? outer : inner;
			const angle = ((i * 36 - 90) * Math.PI) / 180;
			return pointOf(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
		});
		return `M${corners.join('L')}Z`;
	}

	// --- Scenery. ---
	/** Bulbs of the garland of the ball, along its curve. */
	const BULBS = [
		{ x: 14, y: 15.5, paint: 'tone-a' },
		{ x: 32, y: 18.5, paint: 'tone-c' },
		{ x: 50, y: 19.6, paint: 'tone-o' },
		{ x: 110, y: 19.6, paint: 'tone-f' },
		{ x: 128, y: 18.5, paint: 'tone-l' },
		{ x: 146, y: 15.5, paint: 'tone-m' }
	] as const;
	const FLOOR_BOARDS = [-80, -40, 0, 40, 80, 120, 160, 200, 240].map(
		(x) => `M${x} 100L${pointOf(80 + (x - 80) * 0.45, 70)}`
	);
	/** A note of music, its head at the origin. */
	const NOTE =
		'M-2.6 0.4C-2.8 -1.2 -0.6 -2.4 1.1 -1.9L1.1 -9.5C3.5 -9 5.5 -7.6 6 -5.6C5 -6.4 3.8 -6.8 2.6 -6.8L2.6 -0.2C2.5 1.4 0.4 2.6 -1.2 2.2C-2 2 -2.5 1.3 -2.6 0.4Z';
	const KEY_XS = [38, 45, 52, 59, 66, 73, 80, 87, 94];
	const FENCE_XS = [6, 30, 54, 78, 102, 126, 150];
	const GRASS_TUFTS = (x: number, y: number) =>
		`M${pointOf(x - 3, y)}Q${pointOf(x - 3, y - 3)} ${pointOf(x - 4.5, y - 5)}M${pointOf(x, y)}Q${pointOf(x, y - 4)} ${pointOf(x + 0.5, y - 6.5)}M${pointOf(x + 3, y)}Q${pointOf(x + 3, y - 3)} ${pointOf(x + 5, y - 4.5)}`;
	const ZEBRA_TUFTS = [8, 26, 140, 152].map((x) => GRASS_TUFTS(x, 96)).join('');
	const EXTRA_STRIPE =
		'M103 86C110 81 117 87 124 84C129 82 135 82 140.5 83.5C135.5 86.5 130.5 88 126 89.5C118 92.5 110 88.5 103 86Z';
</script>

<!-- An eye: white, a pupil turned by (lookX, lookY), a glint; `lid` from 0 (open) to 1 (shut) in the colour `skin`. -->
{#snippet eye(
	x: number,
	y: number,
	r: number,
	lookX: number,
	lookY: number,
	lid: number,
	skin: string
)}
	<circle class="white line thin" cx={x} cy={y} {r} />
	<circle class="dark" cx={x + lookX * r * 0.38} cy={y + lookY * r * 0.38} r={r * 0.56} />
	<circle
		class="white"
		cx={x + lookX * r * 0.38 - r * 0.2}
		cy={y + lookY * r * 0.38 - r * 0.24}
		r={r * 0.2}
	/>
	{#if lid > 0}
		<path
			class="{skin} line thin"
			d="M{x - r * 1.05} {y - r + 2 * r * lid}A{r * 1.05} {r * 1.05} 0 0 1 {x + r * 1.05} {y -
				r +
				2 * r * lid}Z"
		/>
	{/if}
{/snippet}

<!-- A part of an animal: its shape filled, `marks` drawn inside it, a shade from below, then its outline. -->
{#snippet part(
	name: string,
	shape: string,
	paint: string,
	marks: string,
	markPaint: string,
	shade: string,
	bold: boolean
)}
	<clipPath id={clipOf(name)}><path d={shape} /></clipPath>
	<path class={paint} d={shape} />
	<g clip-path="url(#{clipOf(name)})">
		{#if marks}<path class={markPaint} d={marks} />{/if}
		{#if shade}<path class="shade" d={shade} />{/if}
	</g>
	<path class="open line" class:bold d={shape} />
{/snippet}

<!-- A zebra, standing, looking right; origin on the ground. `pointing`: its front hoof shows the ground ahead. -->
{#snippet zebra(name: string, pointing: boolean)}
	<!-- Far legs, in the shade of the body. -->
	<g transform="translate(5 -0.5)">
		{@render part(
			`${name}-far-hind`,
			ZEBRA_HIND_LEG,
			'white',
			ZEBRA_LEG_STRIPES,
			'dark',
			ZEBRA_HIND_LEG,
			false
		)}
		<path class="dark line" d={ZEBRA_HIND_HOOF} />
	</g>
	<g transform="translate(-5 -0.5)">
		{@render part(
			`${name}-far-front`,
			ZEBRA_FRONT_LEG,
			'white',
			ZEBRA_LEG_STRIPES,
			'dark',
			ZEBRA_FRONT_LEG,
			false
		)}
		<path class="dark line" d={ZEBRA_FRONT_HOOF} />
	</g>
	<path class="open line bold" d="M-31 -41C-36 -39 -38 -33 -37.5 -26" />
	<path class="dark line" d={ZEBRA_TAIL_TUFT} transform="translate(0 -6)" />
	{@render part(`${name}-hind`, ZEBRA_HIND_LEG, 'white', ZEBRA_LEG_STRIPES, 'dark', '', false)}
	<path class="dark line" d={ZEBRA_HIND_HOOF} />
	{#if pointing}
		<g transform="translate(0 -6)">
			{@render part(
				`${name}-front`,
				ZEBRA_POINTING_LEG,
				'white',
				ZEBRA_POINTING_STRIPES,
				'dark',
				'',
				false
			)}
			<path class="dark line" d={ZEBRA_POINTING_HOOF} />
		</g>
	{:else}
		{@render part(`${name}-front`, ZEBRA_FRONT_LEG, 'white', ZEBRA_LEG_STRIPES, 'dark', '', false)}
		<path class="dark line" d={ZEBRA_FRONT_HOOF} />
	{/if}
	<g transform="translate(0 -6)">
		{@render zebraTop(name)}
	</g>
{/snippet}

<!-- The zebra above its legs: mane, body, head. -->
{#snippet zebraTop(name: string)}
	<path class="white line" d={ZEBRA_MANE} />
	<clipPath id={clipOf(`${name}-mane`)}><path d={ZEBRA_MANE} /></clipPath>
	<path class="dark" clip-path="url(#{clipOf(`${name}-mane`)})" d={ZEBRA_STRIPES} />
	<path class="open line" d={ZEBRA_MANE} />
	{@render part(
		`${name}-body`,
		ZEBRA_BODY,
		'white',
		ZEBRA_STRIPES,
		'dark',
		'M-36 -16C-20 -24 4 -24 26 -20L26 -10L-36 -10Z',
		true
	)}
	<path class="white line" d={ZEBRA_EAR} transform="translate(4 1)" />
	<path class="shade" d={ZEBRA_EAR} transform="translate(4 1)" />
	{@render part(
		`${name}-head`,
		ZEBRA_HEAD,
		'white',
		`${ZEBRA_FACE_STRIPES}M44 -45a6 6 0 1 0 -12 0a6 6 0 1 0 12 0Z`,
		'dark',
		'',
		true
	)}
	<path class="white" d={ZEBRA_EAR} />
	<path class="open line" d={ZEBRA_EAR.replace('Z', '')} />
	<path class="open line thin" d="M18.6 -64C18 -67 17.8 -69.5 18.2 -71.5" />
	<path class="open light-line" d="M37 -47.5Q38.5 -48.8 40 -47.8M35.8 -43.4Q38 -42.4 40.2 -43.6" />
	{@render eye(25.5, -57.5, 2.5, 0.6, 0.8, 0.45, 'white')}
	<path class="open line thin" d="M22.5 -62C24 -63.5 26.5 -63.8 28.5 -62.5" />
{/snippet}

<!-- A cow, looking right, one front hoof up; origin on the ground. -->
{#snippet cow(name: string)}
	<g transform="translate(5 -0.5)">
		<path class="white line" d={COW_HIND_LEG} />
		<path class="shade" d={COW_HIND_LEG} />
		<path class="dark line" d={COW_HIND_HOOF} />
	</g>
	<g transform="translate(-6 -0.5)">
		<path class="white line" d={COW_LEG} />
		<path class="shade" d={COW_LEG} />
		<path class="dark line" d={COW_HOOF} />
	</g>
	<path class="open line bold" d="M-28 -37C-34 -38 -36 -42 -34.5 -46C-33 -50 -35 -53 -37.5 -53" />
	<path
		class="dark line"
		d="M-37 -53C-40 -50.5 -43.5 -51.5 -44.5 -55C-41.5 -57.5 -38 -56.5 -37 -53Z"
	/>
	<path class="white line" d={COW_HIND_LEG} />
	<path class="dark line" d={COW_HIND_HOOF} />
	<path class="white line" d={COW_DANCING_LEG} />
	<path class="dark line" d={COW_DANCING_HOOF} />
	<path class="tone-f line" d="M-17 -17.5C-17.5 -12 -9.5 -12 -9 -17.5Z" />
	{@render part(
		`${name}-body`,
		COW_BODY,
		'white',
		COW_SPOTS,
		'dark',
		'M-36 -17C-20 -25 4 -25 26 -21L26 -10L-36 -10Z',
		true
	)}
	<path
		class="tone-j line thin"
		d="M14.6 -44.2C16.8 -38.6 18.4 -33.4 19.4 -28.6L22 -29C21 -33.8 19.4 -39 17.4 -44.6Z"
	/>
	<path
		class="star line"
		d="M18.6 -28C18.1 -24.5 18.6 -22 21.1 -21C23.6 -22 24.1 -24.5 23.1 -28Z"
	/>
	<g transform="translate(-3 4)">
		<path class="sand line" d={COW_HORN} transform="translate(4 -0.5)" />
		<path class="shade" d={COW_HORN} transform="translate(4 -0.5)" />
		<path class="dark line" d={COW_EAR} />
		<path
			class="tone-f"
			d="M24.5 -51.4C21.5 -53.4 19 -53.4 17.5 -52.8C19.5 -51 22 -50.6 24.5 -50.8Z"
		/>
		<path class="sand line" d={COW_HORN} />
		{@render part(
			`${name}-head`,
			COW_HEAD,
			'white',
			'M48.5 -38a6.5 5.6 0 1 0 -13 0a6.5 5.6 0 1 0 13 0Z',
			'tone-f',
			'',
			true
		)}
		<clipPath id={clipOf(`${name}-cheek`)}><path d={COW_HEAD} /></clipPath>
		<path
			class="dark"
			clip-path="url(#{clipOf(`${name}-cheek`)})"
			d={patchPath([25, -46, 4.2, 10])}
		/>
		<path class="open line" d={COW_HEAD} />
		<ellipse class="dark" cx="44.6" cy="-40.4" rx="1" ry="1.4" transform="rotate(-20 44.6 -40.4)" />
		<path class="open line thin" d="M39 -34.8Q41.8 -33.6 44.4 -35.4" />
		<path class="open line" d="M31.6 -48.8Q33.8 -51 36 -49.2" />
		<path class="open line thin" d="M31.2 -52.6Q33.6 -54.4 36.4 -53.2" />
	</g>
{/snippet}

<!-- The giraffe's head, looking left; origin at the top of its skull. `lookX, lookY`: where its eye looks. -->
{#snippet giraffeHead(name: string, lookX: number, lookY: number)}
	<path class="fur-light line" d={GIRAFFE_EAR} />
	<g transform="translate(3.6 0.8)">
		<path class="fur-light line" d={GIRAFFE_OSSICONE} />
		<ellipse class="tone-p line" cx="1.65" cy="-13.6" rx="2.1" ry="1.8" />
		<path class="shade" d={GIRAFFE_OSSICONE} />
	</g>
	<path class="fur-light line" d={GIRAFFE_OSSICONE} />
	<ellipse class="tone-p line" cx="1.65" cy="-13.6" rx="2.1" ry="1.8" />
	{@render part(
		`${name}-head`,
		GIRAFFE_HEAD,
		'fur-light',
		GIRAFFE_HEAD_PATCHES,
		'spot',
		'M-24 2C-22 9 -12 9 -16 4C-18 2 -22 2 -24 2ZM-24 6C-14 12 0 11 10 3L10 12L-24 12Z',
		true
	)}
	<clipPath id={clipOf(`${name}-muzzle`)}><path d={GIRAFFE_HEAD} /></clipPath>
	<ellipse
		class="sand"
		clip-path="url(#{clipOf(`${name}-muzzle`)})"
		cx="-17"
		cy="3.6"
		rx="6.4"
		ry="6"
	/>
	<path class="open line" d={GIRAFFE_HEAD} />
	<path class="open line thin" d="M-20 2.6Q-19 0.6 -17.2 1.2M-21.2 5.6Q-18 7.2 -14.6 6.2" />
	{@render eye(-3, 0.5, 2.7, lookX, lookY, 0.42, 'fur-light')}
	<path
		class="open line thin"
		d="M-6 -0.4L-7.4 -1.6M-5.4 -1.6L-6.4 -3.2M-6.4 -4.4Q-3 -6.6 0.4 -4.6"
	/>
{/snippet}

<!-- A giraffe, standing, looking left; origin on the ground. -->
{#snippet giraffe(name: string)}
	<g transform="translate(5 -0.5)">
		<path class="fur-light line" d={GIRAFFE_FRONT_LEG} />
		<path class="shade" d={GIRAFFE_FRONT_LEG} />
		<path class="tone-p line" d={GIRAFFE_FRONT_HOOF} />
	</g>
	<g transform="translate(-5 -0.5)">
		<path class="fur-light line" d={GIRAFFE_HIND_LEG} />
		<path class="shade" d={GIRAFFE_HIND_LEG} />
		<path class="tone-p line" d={GIRAFFE_HIND_HOOF} />
	</g>
	<path class="open line" d="M23.5 -52C27 -48 27.5 -40 27 -33" />
	<path class="tone-p line" d="M27 -34C25 -31 25 -28 27 -25.5C29 -28 29 -31 27 -34Z" />
	{@render part(
		`${name}-legs`,
		`${GIRAFFE_FRONT_LEG}${GIRAFFE_HIND_LEG}`,
		'fur-light',
		GIRAFFE_LEG_PATCHES,
		'spot',
		'',
		false
	)}
	<path class="tone-p line" d={GIRAFFE_FRONT_HOOF} />
	<path class="tone-p line" d={GIRAFFE_HIND_HOOF} />
	<path class="tone-p line" d={GIRAFFE_MANE} />
	{@render part(
		`${name}-body`,
		GIRAFFE_BODY,
		'fur-light',
		GIRAFFE_PATCHES,
		'spot',
		'M-30 -38C-10 -46 10 -46 30 -40L30 -30L-30 -30ZM-30 -100C-26 -80 -24 -62 -16 -50L-36 -50Z',
		true
	)}
	<g transform="translate(-28 -104) rotate(-28)">
		{@render giraffeHead(name, -0.5, 0.85)}
	</g>
{/snippet}

<!-- The zebra's face, from the front; origin between its eyes. `lookX, lookY`: where it looks. -->
{#snippet zebraFace(name: string, lookX: number, lookY: number)}
	<path class="white line" d="M-6 2C-8 12 -10 20 -11 32L11 32C10 20 8 12 6 2Z" />
	<clipPath id={clipOf(`${name}-neck`)}
		><path d="M-6 2C-8 12 -10 20 -11 32L11 32C10 20 8 12 6 2Z" /></clipPath
	>
	<g clip-path="url(#{clipOf(`${name}-neck`)})">
		<path
			class="dark"
			d={lensesPath([
				[-14, 14, 14, 14, 2.6, 2],
				[-14, 21, 14, 21, 2.8, 2],
				[-14, 28, 14, 28, 3, 2]
			])}
		/>
		<path class="shade" d="M-12 10L12 10L12 16C4 13 -4 13 -12 16Z" />
	</g>
	<path class="dark line" d="M-3 -11C-3.5 -16 -1.5 -19.5 0 -20C1.5 -19.5 3.5 -16 3 -11Z" />
	<path class="white line" d="M-4.5 -10C-8 -13.5 -11 -18.5 -11.5 -23C-7.5 -21.5 -4 -17.5 -2 -13Z" />
	<path class="white line" d="M4.5 -10C8 -13.5 11 -18.5 11.5 -23C7.5 -21.5 4 -17.5 2 -13Z" />
	<path class="open line thin" d="M-6 -14.5L-9.5 -19.5M6 -14.5L9.5 -19.5" />
	{@render part(
		`${name}-face`,
		'M-7 -8C-7.5 -14.5 7.5 -14.5 7 -8C6.8 -2 4.8 4 5 9C5.2 14 3 17 0 17C-3 17 -5.2 14 -5 9C-4.8 4 -6.8 -2 -7 -8Z',
		'white',
		`${bandsPath([
			[-1.6, -14, -1, -5, 1.8, 0.4],
			[1.6, -14, 1, -5, 1.8, -0.4],
			[-9, -1, -1.5, 1.5, 2, -0.8],
			[9, -1, 1.5, 1.5, 2, 0.8],
			[-9, 4, -1.5, 5.5, 2, -0.6],
			[9, 4, 1.5, 5.5, 2, 0.6]
		])}M6 12.5a6 5.5 0 1 0 -12 0a6 5.5 0 1 0 12 0Z`,
		'dark',
		'',
		true
	)}
	<ellipse class="rock" cx="-2.4" cy="12.6" rx="0.9" ry="1.5" transform="rotate(20 -2.4 12.6)" />
	<ellipse class="rock" cx="2.4" cy="12.6" rx="0.9" ry="1.5" transform="rotate(-20 2.4 12.6)" />
	<path class="open light-line" d="M-3 15.2Q0 16.2 3 15.2" />
	{@render eye(-5.2, -3.5, 2.3, lookX, lookY, 0.3, 'white')}
	{@render eye(5.2, -3.5, 2.3, lookX, lookY, 0.3, 'white')}
	<path class="open line thin" d="M-7.6 -7.4Q-5.2 -9 -2.8 -7.8M2.8 -7.8Q5.2 -9 7.6 -7.4" />
{/snippet}

<!-- The cow's face, from the front; origin between its eyes. -->
{#snippet cowFace(name: string, lookX: number, lookY: number)}
	<path class="white line" d="M-8 4C-10 12 -12 20 -13 32L13 32C12 20 10 12 8 4Z" />
	<clipPath id={clipOf(`${name}-neck`)}
		><path d="M-8 4C-10 12 -12 20 -13 32L13 32C12 20 10 12 8 4Z" /></clipPath
	>
	<g clip-path="url(#{clipOf(`${name}-neck`)})">
		<path class="dark" d={patchPath([9, 24, 7, 20])} />
		<path class="shade" d="M-14 12L14 12L14 20C4 15 -4 15 -14 20Z" />
	</g>
	<path class="sand line" d="M-5.5 -10C-10 -11 -13.5 -14 -13.5 -19.5C-11 -17.5 -8 -16 -3.5 -14Z" />
	<path class="sand line" d="M5.5 -10C10 -11 13.5 -14 13.5 -19.5C11 -17.5 8 -16 3.5 -14Z" />
	<path class="white line" d="M-8 -5C-13 -8.5 -18 -8.5 -20.5 -5.5C-18 -1.5 -13 -1 -8.5 -1.5Z" />
	<path class="dark line" d="M8 -5C13 -8.5 18 -8.5 20.5 -5.5C18 -1.5 13 -1 8.5 -1.5Z" />
	<path class="tone-f" d="M-9 -4.6C-12.5 -6.4 -16 -6.4 -18 -5C-16 -3 -12.5 -2.6 -9 -3Z" />
	{@render part(
		`${name}-face`,
		'M-9 -9C-9 -14.5 9 -14.5 9 -9C9 -3 8 2 7 6L-7 6C-8 2 -9 -3 -9 -9Z',
		'white',
		patchPath([7, -6, 5.5, 10]),
		'dark',
		'',
		true
	)}
	<path class="white" d="M-3 -12.5C-2 -15.5 1 -16 2 -13.5C3.5 -15 5 -14 4 -12Z" />
	<path class="open line" d="M-3 -12.5C-2 -15.5 1 -16 2 -13.5C3.5 -15 5 -14 4 -12" />
	<ellipse class="tone-f line bold" cx="0" cy="8" rx="10" ry="6.5" />
	<ellipse class="dark" cx="-4" cy="7.4" rx="1.3" ry="2" transform="rotate(-15 -4 7.4)" />
	<ellipse class="dark" cx="4" cy="7.4" rx="1.3" ry="2" transform="rotate(15 4 7.4)" />
	<path class="open line thin" d="M-3.5 11.6Q0 13 3.5 11.6" />
	{@render eye(-4.4, -3.4, 2.4, lookX, lookY, 0.28, 'white')}
	{@render eye(4.4, -3.4, 2.4, lookX, lookY, 0.28, 'dark')}
	<path class="open line thin" d="M-6.8 -7.2Q-4.4 -8.8 -2 -7.4" />
	<path class="open light-line" d="M2 -7.4Q4.4 -8.8 6.8 -7.2" />
{/snippet}

{#if art === 'zoo-opening'}
	<g data-story-art="zoo-opening">
		<!-- Behind the glass: the visitors' hall, and the animals who came to look. -->
		<rect class="rock" x="0" y="0" width="160" height="66" />
		<path class="soil" d="M0 50L160 50L160 66L0 66Z" />
		<path class="shade" d="M0 40C40 46 120 46 160 40L160 66L0 66Z" />
		<g transform="translate(30 31)">
			{@render zebraFace('opening-zebra', 0.7, 0.7)}
		</g>
		<g transform="translate(128 30) scale(1.1)">
			{@render cowFace('opening-cow', -0.8, 0.6)}
		</g>
		<path class="tone-p line" d="M88.5 -4C90.5 6 90.5 13 88.5 20L93 21C95 13 95.5 6 94 -4Z" />
		{@render part(
			'opening-neck',
			'M92 -4C94 6 94 14 91 21L99.5 25.5C103 16 108 6 111 -4Z',
			'fur-light',
			patchesPath([
				[98, 0, 3.6, 0],
				[106, 2, 3.4, 30],
				[97, 9, 3.4, 10],
				[104, 11, 3.2, 40],
				[97, 18, 3, 20]
			]),
			'spot',
			'M106 -4C104 8 102 18 100 26L112 26L112 -4Z',
			false
		)}
		<g transform="translate(90 26) rotate(-58) scale(1.05)">
			{@render giraffeHead('opening-giraffe', -0.3, 0.95)}
		</g>
		<!-- The glass, its reflections, and where noses touched it. -->
		<ellipse class="glass" cx="128" cy="40" rx="13" ry="7.5" />
		<ellipse class="glass" cx="30" cy="46" rx="6.5" ry="3.2" />
		<path class="glass" d="M40 8L54 8L18 60L8 60L8 52Z" />
		<path class="glass" d="M60 8L64 8L28 60L24 60Z" />
		<path class="glass" d="M140 8L152 8L152 14L118 60L106 60Z" />
		<path
			class="metal line bold"
			fill-rule="evenodd"
			d="M2 2L158 2L158 64L2 64ZM8 8L8 60L152 60L152 8Z"
		/>
		<path class="light" d="M3.5 3.5L156.5 3.5L152 8L8 8Z" />
		<path class="shade" d="M8 60L152 60L156.5 62.5L3.5 62.5Z" />
		<!-- This side of the glass: the dino's enclosure. -->
		<path class="sand line" d="M-2 64L162 64L162 102L-2 102Z" />
		<path class="shade" d="M-2 64L162 64L162 69C110 66 50 66 -2 69Z" />
		<g transform="translate(-10 3)">
			<path
				class="rock line"
				d="M118 92C116 82 122 74 132 73C142 72 150 78 152 88C153 93 148 95 140 95C130 95 120 96 118 92Z"
			/>
			<path class="light" d="M124 80C127 76 132 75 136 76C131 77 128 79 126 82Z" />
			<path class="open line thin" d="M134 76C136 82 136 88 133 94" />
		</g>
		<path class="open line" d={GRASS_TUFTS(16, 90)} />
		<path class="open line" d={GRASS_TUFTS(100, 96)} />
		<path class="open line" d={GRASS_TUFTS(152, 93)} />
		<path class="water line" d="M22 84C22 80 42 80 42 84L40 89C38 91 26 91 24 89Z" />
		<ellipse class="water-deep line" cx="32" cy="84" rx="10" ry="2.2" />
		<path
			class="metal line"
			d="M141 67C141 66 142 65.5 143 65.5L155 65.5C156 65.5 157 66 157 67L157 74C157 75 156 75.5 155 75.5L143 75.5C142 75.5 141 75 141 74Z"
		/>
		<path class="dark" d={PRINT_PATHS.dino} transform="translate(149 70.6) scale(0.42)" />
		<StoryDino x={50} y={46} size={52} mood="happy" />
	</g>
{:else if art === 'zoo-giraffe'}
	<g data-story-art="zoo-giraffe">
		<defs>
			<linearGradient id={clipOf('giraffe-sky')} x1="0" y1="0" x2="0" y2="1">
				<stop class="stop-sky" offset="0" />
				<stop class="stop-paper" offset="1" />
			</linearGradient>
		</defs>
		<rect fill="url(#{clipOf('giraffe-sky')})" x="0" y="0" width="160" height="100" />
		<path class="leaf line" d="M-2 66C20 58 40 60 60 64C90 58 130 56 162 62L162 80L-2 80Z" />
		<path class="wood line" d="M14 62C14 54 15 46 14 40L17 40C17 46 17.5 54 18 62Z" />
		<path
			class="leaf line"
			d="M2 42C2 34 12 30 18 32C24 28 34 32 32 38C34 44 22 46 16 43C10 46 2 46 2 42Z"
		/>
		<path class="light" d="M8 36C12 33 17 33 20 34C16 35 12 36 9 38Z" />
		{#each FENCE_XS as postX (postX)}
			<path
				class="wood line"
				d="M{postX - 1.5} 76L{postX - 1.5} 62Q{postX} 60 {postX + 1.5} 62L{postX + 1.5} 76Z"
			/>
		{/each}
		<path class="wood line" d="M-2 65L162 65L162 67.5L-2 67.5ZM-2 71L162 71L162 73.5L-2 73.5Z" />
		<!-- The desk, the screen and what is typed on it. -->
		<path class="wood line" d="M-2 80L162 80L162 102L-2 102Z" />
		<path class="light" d="M-2 81L162 81L162 83L-2 83Z" />
		<path class="metal line" d="M60 72L70 72L72 80L58 80Z" />
		<path class="metal line" d="M50 80C50 78 80 78 80 80Z" />
		<path
			class="dark line bold"
			d="M22 30C22 27 24 25 27 25L103 25C106 25 108 27 108 30L108 69C108 72 106 74 103 74L27 74C24 74 22 72 22 69Z"
		/>
		<path class="page" d="M27 30L103 30L103 69L27 69Z" />
		<path class="tone-i" d="M27 30L103 30L103 35L27 35Z" />
		<path
			class="open ink-line"
			d="M33 42L52 42M56 42L70 42M33 50L45 50M49 50L66 50M70 50L82 50M33 58L58 58"
		/>
		<path class="tone-j" d="M61 54L62.6 54L62.6 61L61 61Z" />
		<path class="shade" d="M84 30L103 30L103 52C96 46 90 38 84 30Z" />
		<path
			class="metal line"
			d="M30 84C30 82 31 81 33 81L105 81C107 81 108 82 108 84L110 94C110 96 109 97 107 97L29 97C27 97 26 96 26 94Z"
		/>
		{#each KEY_XS as keyX (keyX)}
			<path
				class="white line thin"
				d="M{keyX} 84L{keyX + 5.5} 84L{keyX + 5.8} 87.4L{keyX - 0.3} 87.4Z"
			/>
			<path
				class="white line thin"
				d="M{keyX - 0.6} 89.4L{keyX + 5.9} 89.4L{keyX + 6.2} 93L{keyX - 0.9} 93Z"
			/>
		{/each}
		<path class="white line thin" d="M50 94.6L84 94.6L84.4 96L49.6 96Z" />
		<!-- The giraffe: its neck comes down from far above. -->
		<path class="tone-p line" d={LONG_MANE} />
		{@render part(
			'giraffe-neck',
			LONG_NECK,
			'fur-light',
			LONG_NECK_PATCHES,
			'spot',
			'M118 40C134 26 152 10 172 -8L180 -8L180 40Z',
			true
		)}
		<g transform="translate(106 33) rotate(-34) scale(1.35)">
			{@render giraffeHead('giraffe', -0.9, 0.45)}
		</g>
	</g>
{:else if art === 'zoo-cow'}
	<g data-story-art="zoo-cow">
		<rect class="night" x="0" y="0" width="160" height="100" />
		<path class="beam" d="M74 0L86 0L120 90L40 90Z" />
		<path class="wood line" d="M-2 70L162 70L162 102L-2 102Z" />
		<path class="open line thin" d={FLOOR_BOARDS.join('')} />
		<path class="shade" d="M-2 70L162 70L162 76L-2 76Z" />
		<ellipse class="star" cx="80" cy="90" rx="38" ry="7" />
		<!-- Curtains. -->
		<path class="tone-j line" d="M-2 -2L22 -2C18 20 16 40 18 72L-2 72Z" />
		<path class="tone-j line" d="M162 -2L138 -2C142 20 144 40 142 72L162 72Z" />
		<path
			class="shade"
			d="M10 -2C8 20 7 40 9 72L-2 72L-2 -2ZM150 -2C152 20 153 40 151 72L162 72L162 -2Z"
		/>
		<!-- Garland and mirror ball. -->
		<path class="open line" d="M-2 12Q40 26 80 12Q120 26 162 12" />
		{#each BULBS as bulb (bulb.x)}
			<path
				class="dark"
				d="M{bulb.x - 1.2} {bulb.y - 2.4}L{bulb.x + 1.2} {bulb.y - 2.4}L{bulb.x +
					1} {bulb.y}L{bulb.x - 1} {bulb.y}Z"
			/>
			<ellipse class="{bulb.paint} line" cx={bulb.x} cy={bulb.y + 2.2} rx="2.2" ry="2.8" />
			<ellipse class="light" cx={bulb.x - 0.7} cy={bulb.y + 1.4} rx="0.7" ry="1" />
		{/each}
		<path class="open line" d="M80 -2L80 8" />
		<circle class="metal line" cx="80" cy="14" r="6.5" />
		<clipPath id={clipOf('cow-ball')}><circle cx="80" cy="14" r="6.5" /></clipPath>
		<g clip-path="url(#{clipOf('cow-ball')})">
			<path
				class="open line thin"
				d="M73 11.5Q80 9.5 87 11.5M73 16.5Q80 18.5 87 16.5M77 7Q75 14 77 21M83 7Q85 14 83 21"
			/>
			<path class="light" d="M74 8L80 8L80 12L74 12Z" />
			<path class="shade" d="M72 16Q80 22 88 16L88 22L72 22Z" />
		</g>
		<path class="star" d="M68 22L69 25L72 26L69 27L68 30L67 27L64 26L67 25Z" />
		<path class="star" d="M93 20L93.8 22.2L96 23L93.8 23.8L93 26L92.2 23.8L90 23L92.2 22.2Z" />
		<!-- The audience, keeping its distance. -->
		<g transform="translate(24 92) scale(0.5)">
			{@render zebra('cow-zebra', false)}
		</g>
		<g transform="translate(134 92) scale(0.52)">
			{@render giraffe('cow-giraffe')}
		</g>
		<!-- The dancer. -->
		<ellipse class="shade" cx="80" cy="90" rx="26" ry="3.6" />
		<g transform="translate(78 90) scale(0.82) rotate(-6 0 -10)">
			{@render cow('cow')}
		</g>
		<path class="open swish" d="M103 70Q108 74 106 80M107 67Q113 73 110 82" />
		<path class="star" d={NOTE} transform="translate(104 31) rotate(10)" />
		<path class="star" d={NOTE} transform="translate(50 30) rotate(-12) scale(0.8)" />
	</g>
{:else if art === 'zoo-yak'}
	<g data-story-art="zoo-yak">
		<defs>
			<linearGradient id={clipOf('yak-sky')} x1="0" y1="0" x2="0" y2="1">
				<stop class="stop-sky" offset="0" />
				<stop class="stop-paper" offset="1" />
			</linearGradient>
		</defs>
		<rect fill="url(#{clipOf('yak-sky')})" x="0" y="0" width="160" height="100" />
		<!-- A painted mountain at the back of the enclosure. -->
		<path
			class="rock line"
			d="M-2 70L22 30C26 24 30 24 34 30L48 50L64 22C68 16 72 16 76 22L104 70Z"
		/>
		<path
			class="white"
			d="M60 29L64 22C68 16 72 16 76 22L80 29C76 27 74 31 70 28C66 31 64 27 60 29Z"
		/>
		<path
			class="white"
			d="M19 35L22 30C26 24 30 24 34 30L37 35C33 33 31 36 28 34C25 36 23 33 19 35Z"
		/>
		<path class="shade" d="M70 18L76 22L104 70L80 70Z" />
		<path class="grass line" d="M-2 68C40 64 120 64 162 68L162 102L-2 102Z" />
		<path class="leaf" d="M-2 92C40 88 120 88 162 92L162 102L-2 102Z" />
		<path class="open line" d={GRASS_TUFTS(12, 94)} />
		<path class="open line" d={GRASS_TUFTS(70, 97)} />
		<!-- The yak. -->
		<g transform="translate(6 -3)">
			<ellipse class="shade" cx="118" cy="93" rx="42" ry="3.4" />
			{#each [93, 101, 141, 149] as legX (legX)}
				<g transform="translate({legX} 86)">
					<path class="tone-p line" d={YAK_LEG} />
					<path class="dark line" d={YAK_HOOF} />
				</g>
			{/each}
			<path class="fur" d={YAK_WOOL} />
			<clipPath id={clipOf('yak-wool')}><path d={YAK_WOOL} /></clipPath>
			<g clip-path="url(#{clipOf('yak-wool')})">
				<path class="tone-p" d={YAK_DARK_LOCKS} />
				<path class="spot" d={YAK_LIGHT_LOCKS} />
				<path class="shade" d="M70 72C100 78 140 78 170 68L170 100L70 100Z" />
				<path class="light" d="M92 30C98 22 108 20 116 21C108 23 100 27 95 33Z" />
			</g>
			<path class="open line thin" d={YAK_STRANDS} />
			<path class="open line bold" d={YAK_WOOL} />
			<path class="sand line" d={YAK_FAR_HORN} />
			<path class="shade" d={YAK_FAR_HORN} />
			{@render part(
				'yak-head',
				YAK_HEAD,
				'tone-p',
				'M60 58a8 6.5 0 1 0 16 0a8 6.5 0 1 0 -16 0Z',
				'soil',
				'',
				true
			)}
			<ellipse class="dark" cx="66" cy="56.5" rx="1.2" ry="1.7" transform="rotate(20 66 56.5)" />
			<path class="open line thin" d="M66 62Q69 63.5 72.5 62.5" />
			{@render eye(77, 52, 2.4, -0.9, 0.5, 0.5, 'tone-p')}
			<path class="sand line" d={YAK_NEAR_HORN} />
			<path class="light" d="M62.5 24C62 28 63 31 65.5 33C64.5 30 64 27 64.2 24.5Z" />
			<path class="fur line" d={YAK_FRINGE} />
			<path class="open line thin" d="M73 37C72 41 72.5 45 74 48M80 36C80 40 81 44 82.5 47" />
			<!-- What hides in the wool: a carrot, its leaves sticking out. -->
			<g transform="translate(80 77)">
				<path class="leaf line thin" d={CARROT_LEAVES} />
				<path class="tone-g line thin" d={CARROT_TOP} />
			</g>
			<path class="fur line" d={YAK_BEARD} />
			<path class="open line thin" d="M76 68C77 71 78 73 79.5 76M84 66C85 68 86 70 86.5 71" />
		</g>
		<!-- The dino and its magnifying glass: what the lens shows is twice as big. -->
		<StoryDino x={27} y={40} size={54} mood="idle" flip />
		<path
			class="wood line"
			d="M66.9 79.3L75.6 76.4L76.4 78.4L67.9 81.9C67 82 66.4 80.2 66.9 79.3Z"
		/>
		<clipPath id={clipOf('yak-lens')}><circle cx="85" cy="74" r="8.2" /></clipPath>
		<g clip-path="url(#{clipOf('yak-lens')})">
			<circle class="fur" cx="85" cy="74" r="8.2" />
			<path class="open line thin" d="M78 68C80 72 79 76 81 80M90 66C89 70 91 74 90 78" />
			<g transform="translate(85 72) rotate(70) scale(1.35)">
				<path class="leaf line thin" d={CARROT_LEAVES} />
				<path class="tone-g line thin" d={CARROT_TOP} />
				<path class="open line thin" d="M1.5 -2L2.1 -0.5M4 2.2L4.6 0.8M6.4 -0.2L6.8 1" />
			</g>
			<path class="fur line thin" d="M86 82C88 79 92 78 95 79L95 86L84 86C84 84 85 83 86 82Z" />
			<path class="glass" d="M77 74A8 8 0 0 1 85 66L85 68A6 6 0 0 0 79 74Z" />
		</g>
		<path
			class="metal line"
			fill-rule="evenodd"
			d="M74.5 74a10.5 10.5 0 1 0 21 0a10.5 10.5 0 1 0 -21 0ZM76.8 74a8.2 8.2 0 1 0 16.4 0a8.2 8.2 0 1 0 -16.4 0Z"
		/>
		<path class="light" d="M76 70A10 10 0 0 1 81 65L81.6 66.4A8.6 8.6 0 0 0 77.4 70.6Z" />
	</g>
{:else if art === 'zoo-zebra'}
	<g data-story-art="zoo-zebra">
		<defs>
			<linearGradient id={clipOf('zebra-sky')} x1="0" y1="0" x2="0" y2="1">
				<stop class="stop-sky" offset="0" />
				<stop class="stop-paper" offset="1" />
			</linearGradient>
		</defs>
		<rect fill="url(#{clipOf('zebra-sky')})" x="0" y="0" width="160" height="100" />
		<path class="leaf line" d="M-2 66C30 56 60 58 90 62C120 56 140 56 162 60L162 80L-2 80Z" />
		<path
			class="wood line"
			d="M136 60C136 50 134 44 130 38L133 37C136 42 138 46 139 50C141 45 144 41 148 38L150 40C146 44 142 50 141 60Z"
		/>
		<path
			class="leaf line"
			d="M118 38C116 32 126 28 134 30C140 26 154 28 156 33C162 34 160 40 152 40C142 42 128 42 120 41C116 41 116 39 118 38Z"
		/>
		<path class="light" d="M124 33C130 30 138 30 144 31C136 32 130 33 126 35Z" />
		{#each FENCE_XS as postX (postX)}
			<path
				class="wood line"
				d="M{postX - 1.5} 70L{postX - 1.5} 58Q{postX} 56 {postX + 1.5} 58L{postX + 1.5} 70Z"
			/>
		{/each}
		<path class="wood line" d="M-2 61L162 61L162 63.5L-2 63.5ZM-2 66L162 66L162 68.5L-2 68.5Z" />
		<path class="grass line" d="M-2 70C40 67 120 67 162 70L162 102L-2 102Z" />
		<path class="leaf" d="M-2 94C40 91 120 91 162 94L162 102L-2 102Z" />
		<path class="open line" d={ZEBRA_TUFTS} />
		<!-- The stripe too many, lying in the grass. -->
		<ellipse class="shade" cx="122" cy="88" rx="16" ry="2.6" />
		<path class="dark line" d={EXTRA_STRIPE} />
		<path class="open line" d="M114 90Q113.5 87 112 85M131 88.6Q131.5 85.6 133 84" />
		<path class="open line" d="M115 79L113.4 76.4M121.6 77.6L121.4 74.6M128 78.4L129.6 75.8" />
		<!-- The zebra. -->
		<ellipse class="shade" cx="54" cy="91" rx="34" ry="3.6" />
		<g transform="translate(60 90) scale(1.05)">
			{@render zebra('zebra', true)}
		</g>
	</g>
{:else if art === 'zoo-ending'}
	<g data-story-art="zoo-ending">
		<rect class="wood" x="0" y="0" width="160" height="100" />
		<path class="open line thin" d="M0 30C40 28 120 32 160 29M0 72C50 74 110 70 160 73" />
		<g transform="rotate(-3 80 50)">
			<path class="shade" d="M26 13L142 13L142 99L26 99Z" />
			<path class="page-edge line" d="M24 10L140 10L140 96L24 96Z" />
			<path class="page line" d="M21 7L137 7L137 80C130 84 126 88 124 93L21 93Z" />
			<path class="page-edge line" d="M137 80C132 82 127 86 124 93C128 89 133 87 137 80Z" />
			{#each RULE_YS as ruleY (ruleY)}
				<path class="open ruled" d="M28 {ruleY}L{ruleY > 76 ? 122 : 130} {ruleY}" />
			{/each}
			<path class="open margin" d="M34 9L34 91" />
			{#each PRINTS as print (`${print.x}-${print.y}`)}
				<path
					class={print.paint}
					d={PRINT_PATHS[print.kind]}
					transform="translate({print.x} {print.y}) rotate({print.turn})"
				/>
				{#if print.kind === 'horse'}
					<path
						class="page"
						d={HOOF_STRIPES}
						transform="translate({print.x} {print.y}) rotate({print.turn})"
					/>
				{/if}
			{/each}
			{#each SPECKS as [speckX, speckY, speckR] (`${speckX}-${speckY}`)}
				<circle class="dark" cx={speckX} cy={speckY} r={speckR} />
			{/each}
			<path class="open pencil" d="M96 80C104 76 110 60 118 50C124 42 130 36 140 26" />
			{#each STAR_TRAIL as [starX, starY, starR] (starX)}
				<path class="star line thin" d={starPath(starX, starY, starR)} />
			{/each}
			{#each RING_XS as ringX (ringX)}
				<circle class="dark" cx={ringX} cy="12" r="1.4" />
				<path
					class="metal line"
					d="M{ringX - 1.6} 13C{ringX - 1.6} 4 {ringX + 1.6} 1 {ringX + 1.6} 4L{ringX + 1.6} 12"
				/>
			{/each}
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

	.light-line {
		stroke: var(--dd-color-story-light);
		stroke-width: var(--dd-border-width-thin);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.ink-line {
		stroke: var(--dd-color-story-ink);
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.swish {
		stroke: var(--dd-color-story-star);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.ruled {
		stroke: var(--dd-color-story-page-edge);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.margin {
		stroke: var(--dd-color-story-a);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.pencil {
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-dasharray: var(--dd-border-width-drawing-bold);
		vector-effect: non-scaling-stroke;
	}

	.shade {
		fill: var(--dd-color-story-shade);
		fill-opacity: var(--dd-opacity-story-shade);
	}

	.light {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.glass {
		fill: var(--dd-color-story-white);
		fill-opacity: var(--dd-opacity-glass);
	}

	.beam {
		fill: var(--dd-color-story-star);
		fill-opacity: var(--dd-opacity-story-shade);
	}

	.stop-sky {
		stop-color: var(--dd-color-story-sky);
	}

	.stop-paper {
		stop-color: var(--dd-color-story-paper);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
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

	.page {
		fill: var(--dd-color-story-page);
	}

	.page-edge {
		fill: var(--dd-color-story-page-edge);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.fur {
		fill: var(--dd-color-story-fur);
	}

	.fur-light {
		fill: var(--dd-color-story-fur-light);
	}

	.spot {
		fill: var(--dd-color-story-spot);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.tone-a {
		fill: var(--dd-color-story-a);
	}

	.tone-c {
		fill: var(--dd-color-story-c);
	}

	.tone-f {
		fill: var(--dd-color-story-f);
	}

	.tone-g {
		fill: var(--dd-color-story-g);
	}

	.tone-i {
		fill: var(--dd-color-story-i);
	}

	.tone-j {
		fill: var(--dd-color-story-j);
	}

	.tone-k {
		fill: var(--dd-color-story-k);
	}

	.tone-l {
		fill: var(--dd-color-story-l);
	}

	.tone-m {
		fill: var(--dd-color-story-m);
	}

	.tone-o {
		fill: var(--dd-color-story-o);
	}

	.tone-p {
		fill: var(--dd-color-story-p);
	}
</style>
