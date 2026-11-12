/**
 * What the decors of space add behind the voyage (`shared/decor.ts`), in the units of the scene
 * (520 x 220). The sky goes on beyond the sides, so do the decors. The astres, the rocket, the route
 * and the stars that were already there never change.
 */
import { dotPath, ovalShape } from '../shared/decor-art';

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

/* ------------------------------------------------------------------ Rose nebula */

/** A spiral galaxy far away, seen a little from the side, high in the middle of the sky. */
const GALAXY_AT = { x: 268, y: 44 } as const;

function arm(turn: number): string {
	const points = Array.from({ length: 9 }, (_, index) => {
		const t = index / 8;
		const angle = turn + t * Math.PI * 1.25;
		const r = 4 + t * 26;
		return [GALAXY_AT.x + Math.cos(angle) * r, GALAXY_AT.y + Math.sin(angle) * r * 0.42] as const;
	});
	return points
		.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`)
		.join('');
}

export const GALAXY = {
	glow: ovalShape(GALAXY_AT.x, GALAXY_AT.y, 44, 20),
	arms: arm(0) + arm(Math.PI),
	core: ovalShape(GALAXY_AT.x, GALAXY_AT.y, 5.4, 3.2)
} as const;

/** Little round stars of the colour of the nebula, here and there. */
export const ROSE_STARS = [
	dotPath(84, 92, 1.6),
	dotPath(196, 150, 1.4),
	dotPath(338, 176, 1.6),
	dotPath(410, 70, 1.4),
	dotPath(-80, 90, 1.6),
	dotPath(640, 130, 1.6),
	dotPath(560, 30, 1.2),
	dotPath(-160, 190, 1.4)
].join('');

/* ------------------------------------------------------------------ Milky way */

/** The milky way across the sky, above the route of the rocket, wider than the scene. */
const BAND = { cx: 260, cy: 50, rx: 760, ry: 38, angle: -8 } as const;

/** Two soft strips, faded on both edges: the wide glow and its brighter heart. */
export const MILKY_WAY = {
	transform: `rotate(${BAND.angle} ${BAND.cx} ${BAND.cy})`,
	strips: [
		{ x: BAND.cx - BAND.rx, y: BAND.cy - BAND.ry, width: BAND.rx * 2, height: BAND.ry * 2 },
		{ x: BAND.cx - BAND.rx, y: BAND.cy - BAND.ry * 0.4, width: BAND.rx * 2, height: BAND.ry * 0.8 }
	]
} as const;

/** Star dust along the milky way: a fixed sprinkle, never drawn by chance. */
export const STAR_DUST = Array.from({ length: 56 }, (_, index) => {
	const along = -380 + index * 23;
	const across = ((index * 37) % 29) - 14;
	const slope = Math.tan((BAND.angle * Math.PI) / 180);
	const x = along;
	const y = BAND.cy + (along - BAND.cx) * slope + across;
	const r = index % 3 === 0 ? 1.1 : 0.7;
	return dotPath(x, y, r);
}).join('');
