const MS_PER_SECOND = 1000;
const DURATION_PATTERN = /^(\d*\.?\d+)(ms|s)$/;

/** Reads a CSS time such as `500ms` or `0.5s`. `null` when it is not a time. */
export function parseCssDuration(value: string): number | null {
	const match = DURATION_PATTERN.exec(value.trim());
	if (match === null) return null;
	const amount = Number(match[1]);
	return match[2] === 's' ? amount * MS_PER_SECOND : amount;
}

/** Reads a duration token (a `--dd-duration-…` custom property) so that timers follow the design tokens. */
export function readDurationToken(name: string, root: Element = document.documentElement): number {
	const value = parseCssDuration(getComputedStyle(root).getPropertyValue(name));
	if (value === null) throw new Error(`The token ${name} is not a duration`);
	return value;
}

export type CubicBezier = readonly [number, number, number, number];

const BEZIER_PATTERN = /^cubic-bezier\(\s*([^,()]+),\s*([^,()]+),\s*([^,()]+),\s*([^,()]+)\)$/;
const BISECTION_STEPS = 30;

/** Reads a CSS curve such as `cubic-bezier(0.2, 0, 0, 1)`. `null` when it is not one. */
export function parseCubicBezier(value: string): CubicBezier | null {
	const match = BEZIER_PATTERN.exec(value.trim());
	if (match === null) return null;
	const [x1, y1, x2, y2] = match.slice(1).map(Number) as [number, number, number, number];
	if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
	if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
	return [x1, y1, x2, y2];
}

function bezierAt(p1: number, p2: number, t: number): number {
	const u = 1 - t;
	return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

/** The easing function of a CSS curve: progress in time (0 to 1) to progress of the movement. */
export function cubicBezierEasing([x1, y1, x2, y2]: CubicBezier): (time: number) => number {
	return (time) => {
		if (time <= 0) return 0;
		if (time >= 1) return 1;
		// x grows with t because x1 and x2 are within [0, 1]: a bisection always finds t.
		let low = 0;
		let high = 1;
		for (let step = 0; step < BISECTION_STEPS; step++) {
			const middle = (low + high) / 2;
			if (bezierAt(x1, x2, middle) < time) low = middle;
			else high = middle;
		}
		return bezierAt(y1, y2, (low + high) / 2);
	};
}

/** Reads a curve token (a `--dd-easing-…` custom property) so that movements in code follow it. */
export function readEasingToken(
	name: string,
	root: Element = document.documentElement
): (time: number) => number {
	const curve = parseCubicBezier(getComputedStyle(root).getPropertyValue(name));
	if (curve === null) throw new Error(`The token ${name} is not a cubic-bezier curve`);
	return cubicBezierEasing(curve);
}
