import type { CharDay, Profile } from './types';

/**
 * How much of the days of a character the profile keeps for the adult (version 18): the most
 * recent days, as few as cover `keptKeystrokes` keystrokes and `keptDays` days. Data, never
 * constants in the code; at least what the adult space needs to call a key acquired.
 */
export interface CharDaysRules {
	readonly keptKeystrokes: number;
	readonly keptDays: number;
}

export const CHAR_DAYS_RULES: CharDaysRules = { keptKeystrokes: 60, keptDays: 3 };

/** The unknown day of version 17 comes before every day; the others in the order of the calendar. */
function isBefore(day: string | null, other: string | null): boolean {
	if (day === other) return false;
	if (day === null) return true;
	return other !== null && day < other;
}

/** The fewest most recent days that cover the rules, or all of them when they do not. */
function keptOf(days: readonly CharDay[], rules: CharDaysRules): readonly CharDay[] {
	let start = days.length;
	let keystrokes = 0;
	while (start > 0 && (keystrokes < rules.keptKeystrokes || days.length - start < rules.keptDays)) {
		start -= 1;
		keystrokes += (days[start] as CharDay).attempts;
	}
	return start === 0 ? days : days.slice(start);
}

/**
 * The days of a character with `attempts` keystrokes more on `day`, `errors` of them wrong: added
 * to that day, the days in the order of the calendar (the clock of a device may go back), then
 * the oldest days left out while the others still cover the rules.
 */
export function withCharDay(
	days: readonly CharDay[],
	day: string,
	attempts: number,
	errors: number,
	rules: CharDaysRules
): readonly CharDay[] {
	const same = days.findIndex((entry) => entry.day === day);
	let next: CharDay[];
	if (same >= 0) {
		const entry = days[same] as CharDay;
		next = [...days];
		next[same] = { day, attempts: entry.attempts + attempts, errors: entry.errors + errors };
	} else {
		const after = days.findIndex((entry) => isBefore(day, entry.day));
		const at = after < 0 ? days.length : after;
		next = [...days.slice(0, at), { day, attempts, errors }, ...days.slice(at)];
	}
	return keptOf(next, rules);
}

/**
 * `after` with each keystroke it adds to the results of `before` counted on `day`, character by
 * character (`Profile.charDays`): what a lifetime count of `progress.chars` gained is what was just
 * typed. The store calls it on every change it keeps, so that each play is dated by the device;
 * `after` is given back as it is when no character was typed (a setting, a nickname).
 */
export function withNewCharDays(
	before: Profile,
	after: Profile,
	day: string,
	rules: CharDaysRules = CHAR_DAYS_RULES
): Profile {
	let charDays: Record<string, readonly CharDay[]> | null = null;
	for (const [char, stats] of Object.entries(after.progress.chars)) {
		const earlier = Object.hasOwn(before.progress.chars, char)
			? before.progress.chars[char]
			: undefined;
		const attempts = stats.attempts - (earlier?.attempts ?? 0);
		if (attempts <= 0) continue;
		const errors = Math.min(attempts, Math.max(0, stats.errors - (earlier?.errors ?? 0)));
		charDays ??= { ...after.charDays };
		const days = Object.hasOwn(charDays, char) ? (charDays[char] ?? []) : [];
		charDays[char] = withCharDay(days, day, attempts, errors, rules);
	}
	return charDays === null ? after : { ...after, charDays };
}
