/*
 * Shapes of the companion drawings that are easier to compute than to write by hand. Everything
 * is in SVG user units and rounded, so that the markup stays short and the same on every run.
 */

/** [x, y, width, height] of a drawing, in the coordinates it is drawn in. */
export type Frame = readonly [number, number, number, number];

const DECIMALS = 100;

function round(value: number): number {
	const rounded = Math.round(value * DECIMALS) / DECIMALS;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function point(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/** A star with `points` tips, the first one pointing up. */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
	const corners = Array.from({ length: points * 2 }, (_, i) => {
		const radius = i % 2 === 0 ? outer : inner;
		const angle = (Math.PI * i) / points - Math.PI / 2;
		return point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
	});
	return `M${corners.join('L')}Z`;
}

/** A point of a drawing, `[x, y]`. */
export type XY = readonly [number, number];

/** A star whose tips and inner corners are rounded: `round` is the share of each edge bent. */
export function roundedStarPath(
	cx: number,
	cy: number,
	outer: number,
	inner: number,
	points = 5,
	round = 0.2
): string {
	const corners: XY[] = Array.from({ length: points * 2 }, (_, i) => {
		const radius = i % 2 === 0 ? outer : inner;
		const angle = (Math.PI * i) / points - Math.PI / 2;
		return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
	});
	const toward = ([x, y]: XY, [tx, ty]: XY): string =>
		point(x + (tx - x) * round, y + (ty - y) * round);
	const count = corners.length;
	const parts = corners.map((corner, i) => {
		const before = toward(corner, corners[(i + count - 1) % count] ?? corner);
		const after = toward(corner, corners[(i + 1) % count] ?? corner);
		return `${i === 0 ? 'M' : 'L'}${before}Q${point(...corner)} ${after}`;
	});
	return `${parts.join('')}Z`;
}

/** A fluffy round outline (a pompom): `bumps` arcs bulging `puff` out of a circle. */
export function fluffPath(cx: number, cy: number, r: number, bumps: number, puff: number): string {
	const at = (radius: number, angle: number) =>
		point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
	const step = (2 * Math.PI) / bumps;
	const start = -Math.PI / 2;
	const arcs = Array.from({ length: bumps }, (_, i) => {
		const angle = start + i * step;
		return `Q${at(r + 2 * puff, angle + step / 2)} ${at(r, angle + step)}`;
	});
	return `M${at(r, start)}${arcs.join('')}Z`;
}

/** The point at `t` (0 to 1) of a cubic Bézier curve. */
export function pointOnCubic([p0, p1, p2, p3]: readonly [XY, XY, XY, XY], t: number): XY {
	const u = 1 - t;
	const mix = (i: 0 | 1) =>
		u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
	return [mix(0), mix(1)];
}

/** Short dashes along a cubic Bézier curve, like the stitches of a seam: `share` of each step. */
export function stitchesAlong(
	curve: readonly [XY, XY, XY, XY],
	count: number,
	share = 0.5
): string {
	return Array.from({ length: count }, (_, i) => {
		const t0 = (i + (1 - share) / 2) / count;
		const from = pointOnCubic(curve, t0);
		const to = pointOnCubic(curve, t0 + share / count);
		return `M${point(...from)}L${point(...to)}`;
	}).join('');
}

/** The squares of a checkerboard whose top-left square is filled, as one path. */
export function checkerPath(x: number, y: number, columns: number, rows: number, size: number) {
	const squares: string[] = [];
	for (let row = 0; row < rows; row++) {
		for (let column = row % 2; column < columns; column += 2) {
			squares.push(`M${point(x + column * size, y + row * size)}h${size}v${size}h${-size}Z`);
		}
	}
	return squares.join('');
}

/** Half-width of an ellipse at the height `y`; 0 outside of it. */
export function ellipseHalfWidth(cy: number, rx: number, ry: number, y: number): number {
	const ratio = (y - cy) / ry;
	return ratio * ratio >= 1 ? 0 : rx * Math.sqrt(1 - ratio * ratio);
}

/** The part of an ellipse between two heights, its sides drawn straight: a stripe across a body. */
export function ellipseBand(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	top: number,
	bottom: number
): string {
	const upper = ellipseHalfWidth(cy, rx, ry, top);
	const lower = ellipseHalfWidth(cy, rx, ry, bottom);
	return `M${point(cx - upper, top)}L${point(cx + upper, top)}L${point(cx + lower, bottom)}L${point(cx - lower, bottom)}Z`;
}

/** A square view box around a frame, with a margin around it: the drawing alone, centred. */
export function squareViewBox([x, y, width, height]: Frame, margin: number): string {
	const side = Math.max(width, height) + 2 * margin;
	return [x + width / 2 - side / 2, y + height / 2 - side / 2, side, side].map(round).join(' ');
}
