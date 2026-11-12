/**
 * Small drawings shared by the decors of the games (`decor.ts`): flakes, birds, leaves, stars.
 * Each one is given in the units of the scene that draws it, around the point it is placed at.
 */

type XY = readonly [number, number];

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

function polar(cx: number, cy: number, r: number, degrees: number): XY {
	const angle = (degrees * Math.PI) / 180;
	return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** A round dot, as a path. */
export function dotPath(cx: number, cy: number, r: number): string {
	return `M${pt(cx - r, cy)}A${round(r)} ${round(r)} 0 1 0 ${pt(cx + r, cy)}A${round(r)} ${round(r)} 0 1 0 ${pt(cx - r, cy)}Z`;
}

/** An oval, as a path. */
export function ovalShape(cx: number, cy: number, rx: number, ry: number): string {
	return `M${pt(cx - rx, cy)}A${round(rx)} ${round(ry)} 0 1 0 ${pt(cx + rx, cy)}A${round(rx)} ${round(ry)} 0 1 0 ${pt(cx - rx, cy)}Z`;
}

/** A snowflake of six branches with a little fork on each, to be stroked. */
export function flakePath(cx: number, cy: number, r: number): string {
	return [0, 60, 120, 180, 240, 300]
		.map((degrees) => {
			const [x, y] = polar(cx, cy, r, degrees + 30);
			const [mx, my] = polar(cx, cy, r * 0.55, degrees + 30);
			const [lx, ly] = polar(mx, my, r * 0.32, degrees + 30 - 45);
			const [rx, ry] = polar(mx, my, r * 0.32, degrees + 30 + 45);
			return `M${pt(cx, cy)}L${pt(x, y)}M${pt(mx, my)}L${pt(lx, ly)}M${pt(mx, my)}L${pt(rx, ry)}`;
		})
		.join('');
}

/** A bird far away: two wings in a soft "v", to be stroked. */
export function birdPath(cx: number, cy: number, span: number): string {
	const half = span / 2;
	return (
		`M${pt(cx - half, cy - half * 0.3)}Q${pt(cx - half * 0.45, cy - half * 0.62)} ${pt(cx, cy)}` +
		`Q${pt(cx + half * 0.45, cy - half * 0.62)} ${pt(cx + half, cy - half * 0.3)}`
	);
}

/** A leaf blown by the wind, its tip toward `degrees`, `length` long. */
export function leafShape(cx: number, cy: number, length: number, degrees: number): string {
	const [tx, ty] = polar(cx, cy, length / 2, degrees);
	const [bx, by] = polar(cx, cy, length / 2, degrees + 180);
	const [l1x, l1y] = polar(cx, cy, length * 0.62, degrees + 128);
	const [l2x, l2y] = polar(cx, cy, length * 0.5, degrees + 50);
	const [r1x, r1y] = polar(cx, cy, length * 0.5, degrees - 50);
	const [r2x, r2y] = polar(cx, cy, length * 0.62, degrees - 128);
	return (
		`M${pt(bx, by)}C${pt(l1x, l1y)} ${pt(l2x, l2y)} ${pt(tx, ty)}` +
		`C${pt(r1x, r1y)} ${pt(r2x, r2y)} ${pt(bx, by)}Z`
	);
}

/** The vein of `leafShape`, from its stem to its tip, to be stroked. */
export function leafVein(cx: number, cy: number, length: number, degrees: number): string {
	const [tx, ty] = polar(cx, cy, length * 0.42, degrees);
	const [bx, by] = polar(cx, cy, length * 0.62, degrees + 180);
	return `M${pt(bx, by)}L${pt(tx, ty)}`;
}

/** A star of `points` branches with rounded inner corners. */
export function starShape(cx: number, cy: number, r: number, points = 5): string {
	const inner = r * 0.45;
	const corners = Array.from({ length: points * 2 }, (_, index) => {
		const [x, y] = polar(cx, cy, index % 2 === 0 ? r : inner, -90 + (180 / points) * index);
		return `${index === 0 ? 'M' : 'L'}${pt(x, y)}`;
	});
	return `${corners.join('')}Z`;
}

/** A four-branch twinkle of a star far away. */
export function twinkleShape(cx: number, cy: number, r: number): string {
	const p = (dx: number, dy: number) => pt(cx + dx, cy + dy);
	return `M${p(0, -r)}Q${p(0, 0)} ${p(r, 0)}Q${p(0, 0)} ${p(0, r)}Q${p(0, 0)} ${p(-r, 0)}Q${p(0, 0)} ${p(0, -r)}Z`;
}

/** A crescent moon lit on its left, `r` its radius. */
export function crescentShape(cx: number, cy: number, r: number): string {
	const [ax, ay] = polar(cx, cy, r, -60);
	const [bx, by] = polar(cx, cy, r, 60);
	return `M${pt(ax, ay)}A${round(r)} ${round(r)} 0 1 0 ${pt(bx, by)}A${round(r * 0.78)} ${round(r * 0.78)} 0 1 1 ${pt(ax, ay)}Z`;
}
