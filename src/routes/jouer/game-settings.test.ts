import { describe, expect, it } from 'vitest';
import { defaultSettings, updateSettings, createProfile } from '$lib/state/profile';
import type { GameGuide } from '$lib/games/types';
import { isMotionReduced, toGameSettings } from './game-settings';

const base = defaultSettings('pc');
const NO_GUIDE: GameGuide = { mode: 'none', freshChars: [] };

describe('toGameSettings', () => {
	it('passes the sound and keyboard settings through', () => {
		const settings = { ...base, soundEnabled: false, showKeyboard: false };

		expect(toGameSettings(settings, false, NO_GUIDE)).toMatchObject({
			soundEnabled: false,
			showKeyboard: false
		});
	});

	it('keeps the default error policy, where a wrong key does not move on', () => {
		expect(toGameSettings(base, false, NO_GUIDE).errorPolicy).toBe('retry');
	});

	it.each([
		['system', false, false],
		['system', true, true],
		['reduced', false, true],
		['full', true, false]
	] as const)(
		'motion %s with a system preference of %s gives reduced motion %s',
		(motion, system, expected) => {
			expect(toGameSettings({ ...base, motion }, system, NO_GUIDE).reducedMotion).toBe(expected);
		}
	);

	it('passes the guide of the lesson through', () => {
		const guide: GameGuide = { mode: 'new-keys', freshChars: ['f', 'j'] };
		expect(toGameSettings(base, false, guide).guide).toBe(guide);
	});

	it('reduces motion exactly as the games are told to', () => {
		for (const motion of ['system', 'reduced', 'full'] as const) {
			for (const system of [false, true]) {
				const settings = { ...base, motion };
				expect(isMotionReduced(settings, system)).toBe(
					toGameSettings(settings, system, NO_GUIDE).reducedMotion
				);
			}
		}
	});

	it('reads the settings of a real profile', () => {
		const profile = updateSettings(
			createProfile({ id: 'a', name: 'Léa', now: 1, platform: 'pc' }),
			{ motion: 'reduced' }
		);

		expect(toGameSettings(profile.settings, false, NO_GUIDE).reducedMotion).toBe(true);
	});
});
