/* Shared by the parsers of the voice files: every error names the path of what is wrong. */

export const VOICE_LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

export function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

export function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
}

export function refuseUnknownKeys(
	record: Record<string, unknown>,
	known: readonly string[],
	path: string
): void {
	for (const name of Object.keys(record)) {
		if (!known.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

export function expectText(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a non-empty string');
	return value;
}

export function expectLocale(value: unknown, path: string): string {
	if (typeof value !== 'string' || !VOICE_LOCALE_PATTERN.test(value)) {
		fail(path, 'expected a language tag such as "fr"');
	}
	return value;
}

export function expectPositive(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		fail(path, 'expected a positive number');
	}
	return value;
}

export function expectPositiveInteger(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		fail(path, 'expected a positive integer');
	}
	return value;
}

/** A share of something: above 0, up to 1. */
export function expectShare(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1) {
		fail(path, 'expected a number above 0 and up to 1');
	}
	return value;
}
