import type { LookReminderRule } from '../types';

/**
 * Caps Lock makes every letter a capital: when the text asks for a lowercase letter, the child
 * needs to be told why the keys are refused. A digit, a space or a capital cannot be affected.
 */
export function needsCapsLockHelp(capsLockOn: boolean, expected: string | undefined): boolean {
	if (!capsLockOn || expected === undefined) return false;
	return expected !== expected.toLocaleUpperCase() && expected === expected.toLocaleLowerCase();
}

/** Reminders due once `typed` characters are typed: the first after `firstAfterChars`, then every `everyChars`. */
function remindersBy(typed: number, rule: LookReminderRule): number {
	if (typed < rule.firstAfterChars) return 0;
	return 1 + Math.floor((typed - rule.firstAfterChars) / rule.everyChars);
}

/**
 * Between two groups, the child is reminded to look at the screen (audit P-20): once
 * `firstAfterChars` characters are typed, then every `everyChars` more. Counted in characters, a
 * play of three long groups has its reminder as one of eight short ones (ADR-074). Never while
 * typing, never after the last group, never without a rule. Gives which reminder of the play is
 * due, 0 for the first, or `null`.
 */
export function lookReminderDue(
	groupLengths: readonly number[],
	completed: number,
	rule: LookReminderRule | undefined
): number | null {
	if (rule === undefined || completed <= 0 || completed >= groupLengths.length) return null;
	const before = groupLengths.slice(0, completed - 1).reduce((sum, length) => sum + length, 0);
	const after = before + (groupLengths[completed - 1] ?? 0);
	const due = remindersBy(after, rule);
	return due > remindersBy(before, rule) ? due - 1 : null;
}
