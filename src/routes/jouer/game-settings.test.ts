import { describe, expect, it } from 'vitest';
import { defaultSettings, updateSettings, createProfile } from '$lib/state/profile';
import { toGameSettings } from './game-settings';

const base = defaultSettings('pc');

describe('toGameSettings', () => {
	it('passes the sound and keyboard settings through', () => {
		const settings = { ...base, soundEnabled: false, showKeyboard: false };

		expect(toGameSettings(settings, false)).toMatchObject({
			soundEnabled: false,
			showKeyboard: false
		});
	});

	it('keeps the default error policy, where a wrong key does not move on', () => {
		expect(toGameSettings(base, false).errorPolicy).toBe('retry');
	});

	it.each([
		['system', false, false],
		['system', true, true],
		['reduced', false, true],
		['full', true, false]
	] as const)(
		'motion %s with a system preference of %s gives reduced motion %s',
		(motion, system, expected) => {
			expect(toGameSettings({ ...base, motion }, system).reducedMotion).toBe(expected);
		}
	);

	it('reads the settings of a real profile', () => {
		const profile = updateSettings(
			createProfile({ id: 'a', name: 'Léa', now: 1, platform: 'pc' }),
			{ motion: 'reduced' }
		);

		expect(toGameSettings(profile.settings, false).reducedMotion).toBe(true);
	});
});
