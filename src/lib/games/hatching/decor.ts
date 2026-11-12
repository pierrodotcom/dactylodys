/**
 * The decors of the hatching (`shared/decor.ts`): an arched window of landscape behind the egg, in
 * the units of the egg drawing (120 x 150, its ground at y = 146). The first decor has none.
 */
import {
	birdPath,
	crescentShape,
	dotPath,
	flakePath,
	ovalShape,
	starShape,
	twinkleShape
} from '../shared/decor-art';

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/** The arch: a little wider than the egg, round on top, its lower corners softened. */
const ARCH = { left: -16, right: 136, top: 2, bottom: 152, corner: 10 } as const;
const ARCH_RADIUS = (ARCH.right - ARCH.left) / 2;
export const ARCH_PATH =
	`M${pt(ARCH.left, ARCH.top + ARCH_RADIUS)}` +
	`A${ARCH_RADIUS} ${ARCH_RADIUS} 0 0 1 ${pt(ARCH.right, ARCH.top + ARCH_RADIUS)}` +
	`L${pt(ARCH.right, ARCH.bottom - ARCH.corner)}Q${pt(ARCH.right, ARCH.bottom)} ${pt(ARCH.right - ARCH.corner, ARCH.bottom)}` +
	`L${pt(ARCH.left + ARCH.corner, ARCH.bottom)}Q${pt(ARCH.left, ARCH.bottom)} ${pt(ARCH.left, ARCH.bottom - ARCH.corner)}Z`;

/** A band wider than the arch, from `top` down to its bottom: the clip keeps what is inside. */
function ground(top: string): string {
	return `${top}L${pt(ARCH.right + 4, ARCH.bottom + 4)}L${pt(ARCH.left - 4, ARCH.bottom + 4)}Z`;
}

/** A round sun with a small light on its upper left. */
function sun(cx: number, cy: number, r: number) {
	return {
		disc: dotPath(cx, cy, r),
		light: ovalShape(cx - r * 0.36, cy - r * 0.38, r * 0.3, r * 0.18)
	};
}

/** A small cloud around its own centre. */
function cloud(cx: number, cy: number, k: number): string {
	const p = (dx: number, dy: number) => pt(cx + dx * k, cy + dy * k);
	return (
		`M${p(-12, 4)}C${p(-16, 4)} ${p(-17, -2)} ${p(-12, -3)}C${p(-12, -8)} ${p(-5, -10)} ${p(-2, -6)}` +
		`C${p(1, -11)} ${p(9, -10)} ${p(10, -4)}C${p(15, -4)} ${p(17, 3)} ${p(12, 4)}Z`
	);
}

/* ------------------------------------------------------------------ Nest, in spring */

export const NEST_SPRING = {
	sun: sun(4, 40, 9),
	cloud: cloud(92, 30, 1),
	birds: birdPath(46, 22, 8) + birdPath(58, 16, 6),
	hillFar: ground(
		`M${pt(ARCH.left - 4, 112)}Q${pt(20, 96)} ${pt(52, 106)}Q${pt(90, 118)} ${pt(ARCH.right + 4, 100)}`
	),
	hillNear: ground(
		`M${pt(ARCH.left - 4, 128)}Q${pt(30, 116)} ${pt(70, 126)}Q${pt(110, 134)} ${pt(ARCH.right + 4, 122)}`
	),
	tufts: [
		[-6, 140],
		[124, 136],
		[10, 150],
		[108, 150]
	]
		.map(
			([x = 0, y = 0]) =>
				`M${pt(x - 3, y)}Q${pt(x - 3.4, y - 3)} ${pt(x - 5, y - 5)}M${pt(x, y)}Q${pt(x, y - 4)} ${pt(x - 0.4, y - 6.6)}M${pt(x + 3, y)}Q${pt(x + 3.4, y - 3)} ${pt(x + 5, y - 4.6)}`
		)
		.join(''),
	flowers: [
		{ x: -4, y: 128, r: 5 },
		{ x: 126, y: 124, r: 4.4 },
		{ x: 6, y: 138, r: 3.6 }
	].map(({ x, y, r }) => ({
		petals: Array.from({ length: 6 }, (_, index) => {
			const angle = (index * 60 * Math.PI) / 180;
			return dotPath(x + Math.cos(angle) * r * 0.62, y + Math.sin(angle) * r * 0.62, r * 0.4);
		}),
		heart: dotPath(x, y, r * 0.38)
	}))
} as const;

/** The nest: its back behind the egg, its front rim over the bottom of the egg. */
export const NEST = {
	back: 'M2 134C2 120 24 115 60 115C96 115 118 120 118 134C118 144 96 148 60 148C24 148 2 144 2 134Z',
	front:
		'M-2 130C10 139 38 142 60 142C82 142 110 139 122 130C126 138 124 150 112 152L8 152C-4 150 -6 138 -2 130Z',
	frontShade: 'M-8 140C8 149 38 151 60 151C82 151 112 149 128 140L128 156L-8 156Z',
	straws:
		'M4 138Q18 146 34 146M28 149Q44 151 60 149M64 149Q80 151 94 148M88 145Q104 145 116 137' +
		'M10 147Q18 144 26 147M48 146Q56 143 64 146M76 146Q84 143 92 147M0 134Q4 132 8 136M112 136Q116 132 120 134',
	backStraws:
		'M14 121Q30 117 44 119M76 119Q92 117 106 121M6 128Q12 124 20 125M100 125Q108 124 114 128'
} as const;

/* ------------------------------------------------------------------ Beach */

export const BEACH = {
	sun: sun(104, 32, 10),
	cloud: cloud(18, 46, 0.9),
	sea: ground(`M${pt(ARCH.left - 4, 104)}L${pt(ARCH.right + 4, 104)}`),
	waves: `M${pt(-10, 112)}Q${pt(-4, 109)} ${pt(2, 112)}Q${pt(8, 115)} ${pt(14, 112)}M${pt(96, 110)}Q${pt(102, 107)} ${pt(108, 110)}Q${pt(114, 113)} ${pt(120, 110)}M${pt(40, 108)}Q${pt(46, 105)} ${pt(52, 108)}`,
	wet: ground(
		`M${pt(ARCH.left - 4, 122)}Q${pt(30, 116)} ${pt(60, 120)}Q${pt(96, 125)} ${pt(ARCH.right + 4, 118)}`
	),
	foam: `M${pt(ARCH.left - 4, 122)}Q${pt(30, 116)} ${pt(60, 120)}Q${pt(96, 125)} ${pt(ARCH.right + 4, 118)}`,
	sand: ground(
		`M${pt(ARCH.left - 4, 127)}Q${pt(30, 122)} ${pt(60, 126)}Q${pt(96, 131)} ${pt(ARCH.right + 4, 124)}`
	),
	ripples: `M${pt(-8, 142)}Q${pt(0, 139)} ${pt(8, 142)}M${pt(112, 146)}Q${pt(120, 143)} ${pt(128, 146)}`,
	shell: {
		fan: `M${pt(-1, 146)}L${pt(-8, 139)}Q${pt(-7, 133)} ${pt(0, 133)}Q${pt(7, 133)} ${pt(8, 139)}L${pt(1, 146)}Z`,
		ribs: `M${pt(-0.6, 145)}L${pt(-5, 135.6)}M${pt(0, 145)}L${pt(0, 133.6)}M${pt(0.6, 145)}L${pt(5, 135.6)}`
	},
	starfish: starShape(122, 138, 8, 5),
	starfishDots: [
		dotPath(122, 138, 1),
		dotPath(122, 133.6, 0.7),
		dotPath(126, 137, 0.7),
		dotPath(118, 137, 0.7)
	].join('')
} as const;

/* ------------------------------------------------------------------ Snow, at night */

export const SNOW_NIGHT = {
	moon: crescentShape(100, 30, 11),
	stars: [twinkleShape(20, 26, 3.4), twinkleShape(60, 12, 2.6), twinkleShape(124, 64, 2.8)].join(
		''
	),
	dots: [
		dotPath(36, 52, 0.9),
		dotPath(78, 36, 0.8),
		dotPath(-6, 70, 0.9),
		dotPath(110, 92, 0.8),
		dotPath(8, 98, 0.8)
	].join(''),
	flakes: [
		flakePath(-2, 46, 3.4),
		flakePath(122, 40, 3),
		flakePath(14, 82, 2.6),
		flakePath(106, 76, 2.8)
	].join(''),
	hillFar: ground(
		`M${pt(ARCH.left - 4, 114)}Q${pt(24, 100)} ${pt(60, 110)}Q${pt(96, 120)} ${pt(ARCH.right + 4, 104)}`
	),
	hillNear: ground(
		`M${pt(ARCH.left - 4, 132)}Q${pt(30, 122)} ${pt(64, 130)}Q${pt(100, 138)} ${pt(ARCH.right + 4, 126)}`
	),
	firs: [
		{ x: -4, y: 130, h: 30 },
		{ x: 124, y: 126, h: 26 }
	].map(({ x, y, h }) => {
		const w = h * 0.42;
		const tree =
			`M${pt(x, y - h)}L${pt(x + w * 0.62, y - h * 0.56)}L${pt(x + w * 0.36, y - h * 0.56)}` +
			`L${pt(x + w, y - h * 0.12)}L${pt(x - w, y - h * 0.12)}L${pt(x - w * 0.36, y - h * 0.56)}` +
			`L${pt(x - w * 0.62, y - h * 0.56)}Z`;
		const snow =
			`M${pt(x, y - h)}L${pt(x + w * 0.42, y - h * 0.7)}Q${pt(x + w * 0.2, y - h * 0.64)} ${pt(x, y - h * 0.72)}` +
			`Q${pt(x - w * 0.2, y - h * 0.64)} ${pt(x - w * 0.42, y - h * 0.7)}Z`;
		const trunk = `M${pt(x - 1.6, y - h * 0.12)}L${pt(x + 1.6, y - h * 0.12)}L${pt(x + 1.6, y)}L${pt(x - 1.6, y)}Z`;
		return { tree, snow, trunk };
	})
} as const;
