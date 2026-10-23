/**
 * Path tools of the magic drawings. Every path of a drawing is written with absolute M, L, C, Q
 * and Z commands in "x y" pairs: it can then be measured, moved, mirrored and cut without a page.
 */
import type { XY } from '$lib/ui/companion/geometry';

export type { XY };

interface Command {
	readonly op: 'M' | 'L' | 'C' | 'Q' | 'Z';
	readonly points: readonly XY[];
}

const ARITY = { M: 1, L: 1, C: 3, Q: 2, Z: 0 } as const;
const TOKENS = /[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g;
const DECIMALS = 100;

function round(value: number): number {
	const rounded = Math.round(value * DECIMALS) / DECIMALS;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function pt([x, y]: XY): string {
	return `${round(x)} ${round(y)}`;
}

function isOp(token: string): token is Command['op'] {
	return token in ARITY;
}

/** The commands of a path; any other command (relative, arcs) is refused. */
export function parsePath(d: string): Command[] {
	const tokens = d.match(TOKENS) ?? [];
	const commands: Command[] = [];
	let index = 0;
	while (index < tokens.length) {
		const op = tokens[index] ?? '';
		if (!isOp(op)) throw new Error(`drawing path: unexpected "${op}" in ${d}`);
		index += 1;
		do {
			const points: XY[] = [];
			for (let k = 0; k < ARITY[op]; k++) {
				const x = Number(tokens[index]);
				const y = Number(tokens[index + 1]);
				if (Number.isNaN(x) || Number.isNaN(y)) throw new Error(`drawing path: bad point in ${d}`);
				points.push([x, y]);
				index += 2;
			}
			commands.push({ op, points });
		} while (op !== 'Z' && index < tokens.length && !Number.isNaN(Number(tokens[index])));
	}
	return commands;
}

function write(commands: readonly Command[]): string {
	return commands.map((c) => c.op + c.points.map(pt).join(' ')).join('');
}

/** The same path with every point moved by `move`. */
export function mapPath(d: string, move: (point: XY) => XY): string {
	return write(parsePath(d).map((c) => ({ op: c.op, points: c.points.map(move) })));
}

export function shiftPath(d: string, dx: number, dy: number): string {
	return mapPath(d, ([x, y]) => [x + dx, y + dy]);
}

/** Mirrored across the vertical line x = `axis` (the middle of the drawing box by default). */
export function mirrorPath(d: string, axis = 100): string {
	return mapPath(d, ([x, y]) => [2 * axis - x, y]);
}

/** Turned by `degrees` around (cx, cy). */
export function rotatePath(d: string, degrees: number, cx: number, cy: number): string {
	const a = (degrees * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	return mapPath(d, ([x, y]) => [
		cx + (x - cx) * cos - (y - cy) * sin,
		cy + (x - cx) * sin + (y - cy) * cos
	]);
}

/** Scaled by `factor` from (cx, cy). */
export function scalePath(d: string, factor: number, cx: number, cy: number): string {
	return mapPath(d, ([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

/** One path per subpath, each starting with its own M. */
export function subpaths(d: string): string[] {
	const groups: Command[][] = [];
	for (const command of parsePath(d)) {
		if (command.op === 'M' || groups.length === 0) groups.push([]);
		groups[groups.length - 1]?.push(command);
	}
	return groups.map(write);
}

/** A polyline of a subpath; `closed` when it ends with Z. */
export interface Polyline {
	readonly points: readonly XY[];
	readonly closed: boolean;
}

function lerp(a: XY, b: XY, t: number): XY {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function distance(a: XY, b: XY): number {
	return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function cubicAt(p0: XY, p1: XY, p2: XY, p3: XY, t: number): XY {
	const u = 1 - t;
	const a = u * u * u;
	const b = 3 * u * u * t;
	const c = 3 * u * t * t;
	const e = t * t * t;
	return [
		a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0],
		a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]
	];
}

/** The path as polylines, one point about every `step` units. */
export function flatten(d: string, step = 0.75): Polyline[] {
	const lines: { points: XY[]; closed: boolean }[] = [];
	let current: XY = [0, 0];
	let start: XY = [0, 0];
	const add = (point: XY) => lines[lines.length - 1]?.points.push(point);
	for (const { op, points } of parsePath(d)) {
		if (op === 'M') {
			current = points[0] ?? current;
			start = current;
			lines.push({ points: [current], closed: false });
			continue;
		}
		const p0 = current;
		let ends: XY[] = [];
		if (op === 'Z') ends = [start];
		else if (op === 'L') ends = [points[0] ?? p0];
		if (op === 'L' || op === 'Z') {
			const end = ends[0] ?? p0;
			const count = Math.max(1, Math.ceil(distance(p0, end) / step));
			for (let i = 1; i <= count; i++) add(lerp(p0, end, i / count));
			current = end;
			const last = lines[lines.length - 1];
			if (op === 'Z' && last) last.closed = true;
			continue;
		}
		const [a = p0, b = p0, c = p0] = points;
		const p1 = op === 'C' ? a : lerp(p0, a, 2 / 3);
		const p2 = op === 'C' ? b : lerp(op === 'Q' ? b : p0, a, 2 / 3);
		const p3 = op === 'C' ? c : b;
		const net = distance(p0, p1) + distance(p1, p2) + distance(p2, p3);
		const count = Math.max(2, Math.ceil(net / step));
		for (let i = 1; i <= count; i++) add(cubicAt(p0, p1, p2, p3, i / count));
		current = p3;
	}
	return lines;
}

export function polylineLength(points: readonly XY[]): number {
	let length = 0;
	for (let i = 1; i < points.length; i++) {
		length += distance(points[i - 1] ?? [0, 0], points[i] ?? [0, 0]);
	}
	return length;
}

/** Length of a path, all subpaths together. */
export function pathLength(d: string): number {
	return flatten(d).reduce((sum, line) => sum + polylineLength(line.points), 0);
}

/** [minX, minY, maxX, maxY] of a path. */
export function pathBox(d: string): readonly [number, number, number, number] {
	let box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
	for (const line of flatten(d, 2)) {
		for (const [x, y] of line.points) {
			box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
		}
	}
	return box;
}

/** A filled region, ready to tell whether a point is inside it, away from its edge. */
export interface Region {
	readonly box: readonly [number, number, number, number];
	readonly rings: readonly (readonly XY[])[];
}

export function regionOf(d: string): Region {
	return { box: pathBox(d), rings: flatten(d, 1).map((line) => line.points) };
}

function segmentDistance(p: XY, a: XY, b: XY): number {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	const span = dx * dx + dy * dy;
	const t = span === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / span;
	return distance(p, lerp(a, b, Math.min(1, Math.max(0, t))));
}

/** Inside the region (even-odd) and more than `margin` away from its edge. */
export function isDeepInside(region: Region, p: XY, margin: number): boolean {
	const [x, y] = p;
	const [x0, y0, x1, y1] = region.box;
	if (x < x0 + margin || x > x1 - margin || y < y0 + margin || y > y1 - margin) return false;
	let inside = false;
	for (const ring of region.rings) {
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i] ?? [0, 0];
			const [xj, yj] = ring[j] ?? [0, 0];
			if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
		}
	}
	if (!inside) return false;
	for (const ring of region.rings) {
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			if (segmentDistance(p, ring[j] ?? [0, 0], ring[i] ?? [0, 0]) <= margin) return false;
		}
	}
	return true;
}

/** A visible piece of a line, with its length. */
export interface Piece {
	readonly d: string;
	readonly length: number;
	/** Cut where a form hides it: its ends stop flat, under the outline of that form. */
	readonly cut: boolean;
}

const SHORTEST_PIECE = 1.5;

/**
 * The pieces of a line that stay visible when `covers` are painted over it: a line that goes
 * behind a form stops at its outline, so two joined forms only ever show one contour. A subpath
 * left whole keeps its curves; a cut one becomes a fine polyline.
 */
export function visiblePieces(d: string, covers: readonly Region[], margin: number): Piece[] {
	const pieces: Piece[] = [];
	for (const sub of subpaths(d)) {
		const [line] = flatten(sub, 0.6);
		if (!line) continue;
		const shown = line.points.map((p) => !covers.some((region) => isDeepInside(region, p, margin)));
		if (shown.every(Boolean)) {
			pieces.push({ d: sub, length: polylineLength(line.points), cut: false });
			continue;
		}
		const runs: XY[][] = [[]];
		line.points.forEach((p, i) => {
			if (shown[i]) runs[runs.length - 1]?.push(p);
			else if (runs[runs.length - 1]?.length) runs.push([]);
		});
		// A closed line cut away from its start: its last and first runs are one piece.
		const first = runs[0] ?? [];
		const last = runs[runs.length - 1] ?? [];
		if (line.closed && runs.length > 1 && shown[0] && shown[shown.length - 1]) {
			runs[0] = [...last, ...first.slice(1)];
			runs.pop();
		}
		for (const run of runs) {
			const length = polylineLength(run);
			if (length >= SHORTEST_PIECE) {
				pieces.push({ d: `M${run.map(pt).join('L')}`, length, cut: true });
			}
		}
	}
	return pieces;
}

/** An ellipse as four curves, starting at its top and turning clockwise. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
	const k = 0.5523;
	const p = (x: number, y: number) => pt([x, y]);
	return (
		`M${p(cx, cy - ry)}` +
		`C${p(cx + rx * k, cy - ry)} ${p(cx + rx, cy - ry * k)} ${p(cx + rx, cy)}` +
		`C${p(cx + rx, cy + ry * k)} ${p(cx + rx * k, cy + ry)} ${p(cx, cy + ry)}` +
		`C${p(cx - rx * k, cy + ry)} ${p(cx - rx, cy + ry * k)} ${p(cx - rx, cy)}` +
		`C${p(cx - rx, cy - ry * k)} ${p(cx - rx * k, cy - ry)} ${p(cx, cy - ry)}Z`
	);
}

/** Length of an ellipse (Ramanujan), rounded. */
export function ellipseLength(rx: number, ry: number): number {
	const h = ((rx - ry) / (rx + ry)) ** 2;
	return Math.round(Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))));
}
