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
