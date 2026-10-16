import type { GuideMode, HandGuidePreference, ProgressionRules } from './types';

/**
 * What the hand drawn on the keyboard shows during a lesson, `lessonNumber` counted from 1:
 * every key in the first lessons, then the new keys and the key after a mistake, then nothing.
 * The preference of the child or the adult comes first.
 */
export function guideMode(
	rules: ProgressionRules,
	lessonNumber: number,
	preference: HandGuidePreference
): GuideMode {
	if (preference === 'off') return 'none';
	if (preference === 'always') return 'every-key';
	const { handGuide } = rules;
	if (handGuide === undefined) return 'none';
	if (lessonNumber <= handGuide.everyKeyUntil) return 'every-key';
	if (lessonNumber <= handGuide.newKeysUntil) return 'new-keys';
	return 'none';
}

/**
 * Whether the hand shows the expected character now: `afterMistake` while a mistake is shown,
 * `hesitated` once the child has waited long without a key.
 */
export function isGuided(
	mode: GuideMode,
	expected: string | undefined,
	freshChars: readonly string[],
	afterMistake: boolean,
	hesitated = false
): boolean {
	if (expected === undefined) return false;
	switch (mode) {
		case 'every-key':
			return true;
		case 'new-keys':
			return afterMistake || hesitated || freshChars.includes(expected);
		case 'none':
			return false;
	}
}
