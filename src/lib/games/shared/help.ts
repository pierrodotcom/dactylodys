/**
 * Caps Lock makes every letter a capital: when the text asks for a lowercase letter, the child
 * needs to be told why the keys are refused. A digit, a space or a capital cannot be affected.
 */
export function needsCapsLockHelp(capsLockOn: boolean, expected: string | undefined): boolean {
	if (!capsLockOn || expected === undefined) return false;
	return expected !== expected.toLocaleUpperCase() && expected === expected.toLocaleLowerCase();
}

/**
 * Between two groups, every `every` groups, the child is reminded to look at the screen: never
 * while typing, never after the last group, never when `every` is 0.
 */
export function isLookReminderDue(completed: number, total: number, every: number): boolean {
	return every > 0 && completed > 0 && completed < total && completed % every === 0;
}
