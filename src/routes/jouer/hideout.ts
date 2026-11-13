import type { RewardCatalogue, RewardDefinition } from '$lib/engine/rewards';
import rulesData from '../../../content/common/hideout.json';

/*
 * The hideout (ADR-057, proposal 18): a cabin the child decorates with what it won. A fixed list
 * of places, each holding one reward at most; each reward that can be set down (an item or a
 * trophy) names the places it fits. Nothing is bought, drawn by chance nor earned in it.
 */

/** What the profile keeps: the reward identifier set down in each place, by place identifier. */
export type HideoutLayout = Readonly<Record<string, string>>;

export interface HideoutRules {
	/** Every place of the cabin, in the order the child goes through them. */
	readonly places: readonly string[];
	/** The places each drawing fits, by `RewardDefinition.artId`, in order of preference. */
	readonly decorations: Readonly<Record<string, readonly string[]>>;
}

/** Kinds of reward that are objects one can set down: a trick is not. */
const DECORATION_KINDS: ReadonlySet<RewardDefinition['kind']> = new Set(['item', 'trophy']);

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueNames(data: unknown, path: string): string[] {
	if (!Array.isArray(data) || data.length === 0) fail(path, 'expected a non-empty array');
	const names: string[] = [];
	data.forEach((raw: unknown, index) => {
		if (typeof raw !== 'string' || raw === '') fail(`${path}[${index}]`, 'expected a name');
		if (names.includes(raw)) fail(`${path}[${index}]`, `duplicate "${raw}"`);
		names.push(raw);
	});
	return names;
}

/** Validates `content/common/hideout.json`. */
export function parseHideoutRules(data: unknown): HideoutRules {
	if (!isRecord(data)) fail('hideout', 'expected an object');
	for (const name of Object.keys(data)) {
		if (!['schemaVersion', 'places', 'decorations'].includes(name)) {
			fail(`hideout.${name}`, 'unknown property');
		}
	}
	if (data['schemaVersion'] !== 1) fail('hideout.schemaVersion', 'expected 1');
	const places = uniqueNames(data['places'], 'hideout.places');
	const raw = data['decorations'];
	if (!isRecord(raw)) fail('hideout.decorations', 'expected an object');
	const decorations: Record<string, readonly string[]> = {};
	for (const [artId, value] of Object.entries(raw)) {
		const path = `hideout.decorations.${artId}`;
		const fits = uniqueNames(value, path);
		fits.forEach((place, index) => {
			if (!places.includes(place)) fail(`${path}[${index}]`, `unknown place "${place}"`);
		});
		decorations[artId] = fits;
	}
	return { places, decorations };
}

export const HIDEOUT_RULES: HideoutRules = parseHideoutRules(rulesData);

/** Whether a reward is an object of the cabin at all, owned or not. */
export function isDecoration(rules: HideoutRules, reward: RewardDefinition): boolean {
	return DECORATION_KINDS.has(reward.kind) && Object.hasOwn(rules.decorations, reward.artId);
}

/** The places a reward fits; none for what is not an object of the cabin. */
export function placesOf(rules: HideoutRules, reward: RewardDefinition): readonly string[] {
	return isDecoration(rules, reward) ? (rules.decorations[reward.artId] ?? []) : [];
}

/**
 * What the cabin shows, by place: what the profile keeps, once what is unknown, not owned, not
 * allowed in its place or set down twice is left out (the first place in the order of the rules
 * keeps it). The profile itself is never changed by reading it.
 */
export function arrangeHideout(
	layout: HideoutLayout,
	rules: HideoutRules,
	catalogue: RewardCatalogue,
	owned: ReadonlySet<string>
): ReadonlyMap<string, RewardDefinition> {
	const arranged = new Map<string, RewardDefinition>();
	const used = new Set<string>();
	for (const place of rules.places) {
		const id = Object.hasOwn(layout, place) ? layout[place] : undefined;
		const reward = catalogue.rewards.find((candidate) => candidate.id === id);
		if (!reward || used.has(reward.id) || !owned.has(reward.id)) continue;
		if (!placesOf(rules, reward).includes(place)) continue;
		arranged.set(place, reward);
		used.add(reward.id);
	}
	return arranged;
}

/** The layout of what the cabin shows: what was left out is dropped once the child changes something. */
function layoutOf(arranged: ReadonlyMap<string, RewardDefinition>): HideoutLayout {
	return Object.fromEntries([...arranged].map(([place, reward]) => [place, reward.id]));
}

/** The owned objects that fit a place, in the order of the catalogue. */
export function decorationsFor(
	rules: HideoutRules,
	catalogue: RewardCatalogue,
	owned: ReadonlySet<string>,
	place: string
): readonly RewardDefinition[] {
	return catalogue.rewards.filter(
		(reward) => owned.has(reward.id) && placesOf(rules, reward).includes(place)
	);
}

/**
 * Sets a reward down in a place, taking it from where it was (it moves) and replacing what was
 * there. The same layout when the reward is not owned, unknown, or does not fit that place.
 */
export function placeDecoration(
	layout: HideoutLayout,
	rules: HideoutRules,
	catalogue: RewardCatalogue,
	owned: ReadonlySet<string>,
	place: string,
	rewardId: string
): HideoutLayout {
	const reward = catalogue.rewards.find((candidate) => candidate.id === rewardId);
	if (!reward || !owned.has(reward.id) || !placesOf(rules, reward).includes(place)) return layout;
	const arranged = new Map(arrangeHideout(layout, rules, catalogue, owned));
	for (const [where, there] of arranged) if (there.id === reward.id) arranged.delete(where);
	arranged.set(place, reward);
	return layoutOf(arranged);
}

/** Takes away what is in a place; the reward stays owned, only the cabin changes. */
export function removeDecoration(
	layout: HideoutLayout,
	rules: HideoutRules,
	catalogue: RewardCatalogue,
	owned: ReadonlySet<string>,
	place: string
): HideoutLayout {
	const arranged = new Map(arrangeHideout(layout, rules, catalogue, owned));
	arranged.delete(place);
	return layoutOf(arranged);
}
