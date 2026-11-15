import { toGraphemes } from '$lib/engine/graphemes';
import type { ImportedProfile } from '$lib/state/backup';
import { findNickname, normalizeName, renameProfile } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';

/** How a language writes the copy number `number` of a nickname, e.g. "Lou (2)". */
export type CopyNameFormat = (name: string, number: number) => string;

const FIRST_COPY = 2;

/** The copy of `name` numbered `number`, the nickname shortened when the whole would be too long. */
function numbered(name: string, number: number, format: CopyNameFormat): string | null {
	const graphemes = toGraphemes(name);
	for (let length = graphemes.length; length > 0; length--) {
		const candidate = normalizeName(format(graphemes.slice(0, length).join('').trim(), number));
		if (candidate !== null) return candidate;
	}
	return null;
}

/**
 * A nickname for a profile kept beside another one, that no name of `taken` bears
 * (`sameNickname`): the first free copy number from 2, always a valid nickname.
 */
export function distinctName(
	name: string,
	taken: readonly string[],
	format: CopyNameFormat
): string {
	for (let number = FIRST_COPY; number <= taken.length + FIRST_COPY; number++) {
		const candidate = numbered(name, number, format);
		if (candidate !== null && findNickname(candidate, taken) === null) return candidate;
	}
	throw new RangeError(`no free nickname for a copy of "${name}"`);
}

/**
 * The profiles to save after an import, each with a nickname that no other profile of the device
 * bears once they are saved (`sameNickname`): a profile kept beside another (`copyOf`) always gets
 * a copy number; a profile loaded as it is keeps its nickname unless a profile it does not
 * replace, or a profile loaded before it, bears it already.
 */
export function nameCopies(
	imported: readonly ImportedProfile[],
	existing: readonly Profile[],
	format: CopyNameFormat
): readonly Profile[] {
	const replaced = new Set(imported.map((entry) => entry.profile.id));
	const taken = existing
		.filter((profile) => !replaced.has(profile.id))
		.map((profile) => profile.name);
	const names = new Map<number, string>();
	// The profiles loaded as they are first: a copy takes its number after their nicknames.
	imported.forEach(({ profile, copyOf }, index) => {
		if (copyOf !== null) return;
		const free = findNickname(profile.name, taken) === null;
		const name = free ? profile.name : distinctName(profile.name, taken, format);
		names.set(index, name);
		taken.push(name);
	});
	imported.forEach(({ profile, copyOf }, index) => {
		if (copyOf === null) return;
		const name = distinctName(profile.name, taken, format);
		names.set(index, name);
		taken.push(name);
	});
	return imported.map(({ profile }, index) => {
		const name = names.get(index) ?? profile.name;
		return name === profile.name ? profile : renameProfile(profile, name);
	});
}

/**
 * Each nickname that several profiles bear (`sameNickname`), once, as the first of them bears
 * it: profiles made before nicknames had to differ, or on two devices.
 */
export function duplicateNicknames(profiles: readonly Profile[]): string[] {
	const seen: string[] = [];
	const doubled: string[] = [];
	for (const { name } of profiles) {
		const first = findNickname(name, seen);
		if (first === null) seen.push(name);
		else if (findNickname(first, doubled) === null) doubled.push(first);
	}
	return doubled;
}
