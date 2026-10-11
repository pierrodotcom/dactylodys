/**
 * Caps Lock makes every letter a capital: when the text asks for a lowercase letter, the child
 * needs to be told why the keys are refused. A digit, a space or a capital cannot be affected.
 */
export function needsCapsLockHelp(capsLockOn: boolean, expected: string | undefined): boolean {
	if (!capsLockOn || expected === undefined) return false;
	return expected !== expected.toLocaleUpperCase() && expected === expected.toLocaleLowerCase();
}
