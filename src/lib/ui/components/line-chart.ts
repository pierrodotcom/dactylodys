/** The drawing area of a chart, in the units of its SVG `viewBox`. */
export interface ChartFrame {
	readonly width: number;
	readonly height: number;
	/** Room left of the plot for the values of the scale. */
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export interface ChartPoint {
	readonly x: number;
	readonly y: number;
}

const NICE_STEPS = [1, 2, 5, 10] as const;
const TICK_COUNT = 2;

/** The vertical position of a value, `max` at the top of the plot and 0 at its bottom. */
export function chartY(value: number, max: number, frame: ChartFrame): number {
	const plot = frame.height - frame.top - frame.bottom;
	const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
	return frame.top + plot * (1 - share);
}

/** The values spread from left to right; a single value stands in the middle. */
export function chartPoints(
	values: readonly number[],
	max: number,
	frame: ChartFrame
): readonly ChartPoint[] {
	const plot = frame.width - frame.left - frame.right;
	const step = values.length > 1 ? plot / (values.length - 1) : 0;
	return values.map((value, index) => ({
		x: values.length > 1 ? frame.left + index * step : frame.left + plot / 2,
		y: chartY(value, max, frame)
	}));
}

/** The top of a scale that holds `value`: 1, 2 or 5 times a power of ten, never below 1. */
export function niceMax(value: number): number {
	if (!Number.isFinite(value) || value <= 1) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step = NICE_STEPS.find((candidate) => candidate * magnitude >= value) ?? 10;
	return step * magnitude;
}

/** The values written on the scale: 0, the middle and the top. */
export function chartTicks(max: number): readonly number[] {
	return Array.from({ length: TICK_COUNT + 1 }, (_, index) => (max * index) / TICK_COUNT);
}
