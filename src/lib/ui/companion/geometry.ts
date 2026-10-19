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

/** The point of an ellipse at `degrees`, measured as in SVG: 0 to the right, 90 downwards. */
export function ovalPoint(cx: number, cy: number, rx: number, ry: number, degrees: number): XY {
	const angle = (degrees * Math.PI) / 180;
	return [round(cx + rx * Math.cos(angle)), round(cy + ry * Math.sin(angle))];
}

/**
 * Cubic curves along an ellipse from one angle to another (degrees, as in `ovalPoint`), to follow
 * a point already at the first angle: one curve per quarter turn at most, so it stays round.
 */
export function ovalArc(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	from: number,
	to: number
): string {
	const count = Math.max(1, Math.ceil(Math.abs(to - from) / 90));
	const step = ((to - from) * Math.PI) / 180 / count;
	const k = (4 / 3) * Math.tan(step / 4);
	const start = (from * Math.PI) / 180;
	return Array.from({ length: count }, (_, i) => {
		const a0 = start + i * step;
		const a1 = a0 + step;
		const c1 = point(
			cx + rx * (Math.cos(a0) - k * Math.sin(a0)),
			cy + ry * (Math.sin(a0) + k * Math.cos(a0))
		);
		const c2 = point(
			cx + rx * (Math.cos(a1) + k * Math.sin(a1)),
			cy + ry * (Math.sin(a1) - k * Math.cos(a1))
		);
		return `C${c1} ${c2} ${point(cx + rx * Math.cos(a1), cy + ry * Math.sin(a1))}`;
	}).join('');
}

/** A whole ellipse drawn with curves, starting on its right. */
export function ovalPath(cx: number, cy: number, rx: number, ry: number): string {
	return `M${point(cx + rx, cy)}${ovalArc(cx, cy, rx, ry, 0, 360)}Z`;
}

/** A rod with round ends between two points, `r` its half thickness: a handle, a bar, a spoke. */
export function capsulePath(x1: number, y1: number, x2: number, y2: number, r: number): string {
	const length = Math.hypot(x2 - x1, y2 - y1) || 1;
	const nx = (-(y2 - y1) / length) * r;
	const ny = ((x2 - x1) / length) * r;
	const ux = ((x2 - x1) / length) * r * 1.33;
	const uy = ((y2 - y1) / length) * r * 1.33;
	return (
		`M${point(x1 + nx, y1 + ny)}L${point(x2 + nx, y2 + ny)}` +
		`C${point(x2 + nx + ux, y2 + ny + uy)} ${point(x2 - nx + ux, y2 - ny + uy)} ${point(x2 - nx, y2 - ny)}` +
		`L${point(x1 - nx, y1 - ny)}` +
		`C${point(x1 - nx - ux, y1 - ny - uy)} ${point(x1 + nx - ux, y1 + ny - uy)} ${point(x1 + nx, y1 + ny)}Z`
	);
}

/**
 * A long leaf-like stroke along an arc of a circle, thick in its middle and pointed at both ends:
 * a sound wave, a trail behind something that turns. Angles in degrees, as in `ovalPoint`.
 */
export function crescentPath(
	cx: number,
	cy: number,
	r: number,
	from: number,
	to: number,
	thickness: number
): string {
	const middle = (from + to) / 2;
	const half = (((to - from) / 2) * Math.PI) / 180;
	const bulge = r / Math.cos(half);
	const [x1, y1] = ovalPoint(cx, cy, r, r, from);
	const [x2, y2] = ovalPoint(cx, cy, r, r, to);
	const outer = ovalPoint(cx, cy, bulge + thickness, bulge + thickness, middle);
	const inner = ovalPoint(cx, cy, bulge - thickness, bulge - thickness, middle);
	return `M${point(x1, y1)}Q${point(...outer)} ${point(x2, y2)}Q${point(...inner)} ${point(x1, y1)}Z`;
}

/** A square view box around a frame, with a margin around it: the drawing alone, centred. */
export function squareViewBox([x, y, width, height]: Frame, margin: number): string {
	const side = Math.max(width, height) + 2 * margin;
	return [x + width / 2 - side / 2, y + height / 2 - side / 2, side, side].map(round).join(' ');
}
