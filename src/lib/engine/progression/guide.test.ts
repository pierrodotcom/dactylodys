import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { guideMode, isGuided } from './guide';
import type { GuideMode, HandGuidePreference, ProgressionRules } from './types';

const RULES: ProgressionRules = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 5,
	recentCharWindow: 30,
	handGuide: { everyKeyUntil: 4, newKeysUntil: 15 }
};
const MODES: readonly GuideMode[] = ['every-key', 'new-keys', 'none'];

describe('guideMode', () => {
	it('shows every key in the first lessons, then the new keys, then nothing', () => {
		const modes = [1, 4, 5, 15, 16, 24].map((number) => guideMode(RULES, number, 'auto'));
		expect(modes).toEqual(['every-key', 'every-key', 'new-keys', 'new-keys', 'none', 'none']);
	});

	it('follows the preference before the lessons', () => {
		expect(guideMode(RULES, 24, 'always')).toBe('every-key');
		expect(guideMode(RULES, 1, 'off')).toBe('none');
	});

	it('never shows anything on its own when the rules say nothing', () => {
		const withoutGuide = { ...RULES, handGuide: undefined };
		expect(guideMode(withoutGuide, 1, 'auto')).toBe('none');
		expect(guideMode(withoutGuide, 1, 'always')).toBe('every-key');
	});

	it('never gets more helpful as the lessons go on', () => {
		const rank: Record<GuideMode, number> = { 'every-key': 2, 'new-keys': 1, none: 0 };
		const preferences: readonly HandGuidePreference[] = ['auto', 'always', 'off'];
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 40 }),
				fc.integer({ min: 0, max: 40 }),
				fc.constantFrom(...preferences),
				(number, later, preference) => {
					const now = guideMode(RULES, number, preference);
					const after = guideMode(RULES, number + later, preference);
					expect(rank[after]).toBeLessThanOrEqual(rank[now]);
				}
			)
		);
	});
});

describe('isGuided', () => {
	it('shows every key, or none, whatever happened', () => {
		expect(isGuided('every-key', 'a', [], false)).toBe(true);
		expect(isGuided('none', 'f', ['f'], true)).toBe(false);
	});

	it('shows a new key, and any key right after a mistake', () => {
		expect(isGuided('new-keys', 'f', ['f', 'j'], false)).toBe(true);
		expect(isGuided('new-keys', 'd', ['f', 'j'], false)).toBe(false);
		expect(isGuided('new-keys', 'd', ['f', 'j'], true)).toBe(true);
	});

	it('shows nothing when no character is expected', () => {
		for (const mode of MODES) expect(isGuided(mode, undefined, ['f'], true)).toBe(false);
	});
});
