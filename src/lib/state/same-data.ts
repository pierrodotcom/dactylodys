function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Whether two values of plain data (what a profile is made of: what JSON holds) say the same
 * thing, whatever the order of their keys. A page reads with it whether the profile the device
 * holds differs from the one it shows, so that it draws the screen again only when it does.
 */
export function isSameData(first: unknown, second: unknown): boolean {
	if (Object.is(first, second)) return true;
	if (!isObject(first) || !isObject(second)) return false;
	if (Array.isArray(first) !== Array.isArray(second)) return false;
	const keys = Object.keys(first).filter((key) => first[key] !== undefined);
	const others = Object.keys(second).filter((key) => second[key] !== undefined);
	if (keys.length !== others.length) return false;
	return keys.every((key) => Object.hasOwn(second, key) && isSameData(first[key], second[key]));
}
