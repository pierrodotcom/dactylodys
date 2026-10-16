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
