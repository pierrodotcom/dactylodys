import { toGraphemes } from '$lib/engine/graphemes';
import type { ImportedProfile } from '$lib/state/backup';
import { normalizeName, renameProfile } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';

/** How a language writes the copy number `number` of a nickname, e.g. "Lou (2)". */
export type CopyNameFormat = (name: string, number: number) => string;

const FIRST_COPY = 2;

function key(name: string): string {
	return name.normalize('NFC').toLocaleLowerCase();
}

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
 * A nickname for a profile kept beside another one, that no name of `taken` bears (whatever the
 * case): the first free copy number from 2, always a valid nickname.
 */
export function distinctName(
	name: string,
	taken: readonly string[],
	format: CopyNameFormat
): string {
	const used = new Set(taken.map(key));
	for (let number = FIRST_COPY; number <= used.size + FIRST_COPY; number++) {
		const candidate = numbered(name, number, format);
		if (candidate !== null && !used.has(key(candidate))) return candidate;
	}
	throw new RangeError(`no free nickname for a copy of "${name}"`);
}

/**
 * The profiles to save after an import: each profile kept beside another (`copyOf`) gets a
 * nickname that neither a profile of the device nor another loaded profile bears.
 */
export function nameCopies(
	imported: readonly ImportedProfile[],
	existing: readonly Profile[],
	format: CopyNameFormat
): readonly Profile[] {
	const taken = [
		...existing.map((profile) => profile.name),
		...imported.filter((entry) => entry.copyOf === null).map((entry) => entry.profile.name)
	];
	return imported.map(({ profile, copyOf }) => {
		if (copyOf === null) return profile;
		const name = distinctName(profile.name, taken, format);
		taken.push(name);
		return renameProfile(profile, name);
	});
}
