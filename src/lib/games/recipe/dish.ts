/** A message template of the dish names: it receives the first and the last group typed. */
export type DishTemplate = (inputs: { first: string; last: string }) => string;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const SEPARATOR = '\u0000';

function tidy(group: string): string {
	return group.replace(/\s+/g, ' ').trim();
}

/** A small hash of the two groups: the same groups always give the same number. */
export function dishHash(first: string, last: string): number {
	let hash = FNV_OFFSET;
	for (const unit of `${first}${SEPARATOR}${last}`) {
		hash ^= unit.codePointAt(0) ?? 0;
		hash = Math.imul(hash, FNV_PRIME) >>> 0;
	}
	return hash >>> 0;
}

/** Which template names the dish of these two groups. */
export function templateIndex(first: string, last: string, count: number): number {
	if (count <= 0) throw new RangeError('A dish needs at least one template');
	return dishHash(first, last) % count;
}

/**
 * The absurd name of the dish, built only from the first and the last group typed.
 * Nothing is random: the same exercise always gives the same dish.
 */
export function dishName(groups: readonly string[], templates: readonly DishTemplate[]): string {
	const first = tidy(groups[0] ?? '');
	const last = tidy(groups[groups.length - 1] ?? '');
	const template = templates[templateIndex(first, last, templates.length)];
	return (template as DishTemplate)({ first, last });
}
