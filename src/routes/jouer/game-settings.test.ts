import { describe, expect, it } from 'vitest';
import type { ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { defaultSettings, updateSettings, createProfile } from '$lib/state/profile';
import type { GameGuide } from '$lib/games/types';
import azertyPc from '../../../layouts/fr-fr-azerty-pc.json';
import { progressionFor } from './content';
import { fadedKeysFor, isMotionReduced, toGameSettings } from './game-settings';

const base = defaultSettings('pc');
const NO_GUIDE: GameGuide = { mode: 'none', freshChars: [], hesitationMs: 0 };

describe('toGameSettings', () => {
	it('passes the keyboard setting through', () => {
		const settings = { ...base, showKeyboard: false };

		expect(toGameSettings(settings, false, NO_GUIDE)).toMatchObject({ showKeyboard: false });
	});

	it('leaves the sounds to the sound player, which reads the profile itself', () => {
		expect(toGameSettings(base, false, NO_GUIDE)).not.toHaveProperty('soundEnabled');
	});

	it('keeps the default error policy, where a wrong key does not move on', () => {
		expect(toGameSettings(base, false, NO_GUIDE).errorPolicy).toBe('retry');
	});

	it('passes the choice of the adult for Backspace through', () => {
		const settings = { ...base, errorPolicy: 'backspace' as const };
		expect(toGameSettings(settings, false, NO_GUIDE).errorPolicy).toBe('backspace');
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

	it('shows the surprise scenes with the light effects, and none without them', () => {
		const scenes = ['comet', 'gift'];
		expect(toGameSettings(base, false, NO_GUIDE, 0, scenes).scenes).toEqual(scenes);
		const calm = { ...base, effects: false, motion: 'full' as const };
		expect(toGameSettings(calm, false, NO_GUIDE, 0, scenes).scenes).toEqual([]);
		expect(toGameSettings(calm, false, NO_GUIDE, 0, scenes).reducedMotion).toBe(false);
	});

	it('fades no key unless the route says which', () => {
		expect(toGameSettings(base, false, NO_GUIDE).fadedKeys).toEqual([]);
		expect(toGameSettings(base, false, NO_GUIDE, 0, [], ['KeyF']).fadedKeys).toEqual(['KeyF']);
	});

	it('passes the age group of the child to the game, for its bubbles', () => {
		expect(toGameSettings(base, false, NO_GUIDE).ageBand).toBe('8-9');
		expect(toGameSettings({ ...base, ageBand: '10-12' }, false, NO_GUIDE).ageBand).toBe('10-12');
	});

	it('passes the guide of the lesson through', () => {
		const guide: GameGuide = { mode: 'new-keys', freshChars: ['f', 'j'], hesitationMs: 3000 };
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

describe('fadedKeysFor', () => {
	const progression = progressionFor('fr-fr-azerty-pc');
	if (progression === undefined) throw new Error('no progression for AZERTY PC');
	const charIndex = buildCharIndex(parseLayout(azertyPc));
	const [first, , third] = progression.worlds[0]?.lessons ?? [];
	const known = { attempts: 30, errors: 0, latencyMs: null };
	const progress: ProgressState = {
		lessons: {},
		chars: Object.fromEntries(
			['f', 'j', ' ', 'd'].map((char) => [char, { attempts: 30, errors: 0, recent: [known] }])
		)
	};

	it('fades the keys whose characters learned so far are acquired', () => {
		expect(fadedKeysFor(base, progression, progress, first?.id ?? '', charIndex)).toEqual([
			'KeyF',
			'KeyJ'
		]);
		// `k` comes with `d` and is not acquired yet: its key stays written.
		expect(fadedKeysFor(base, progression, progress, third?.id ?? '', charIndex)).toEqual([
			'KeyF',
			'KeyJ',
			'KeyD'
		]);
	});

	it('fades nothing once the adult turned it off', () => {
		const settings = { ...base, keyboardFade: false };
		expect(fadedKeysFor(settings, progression, progress, first?.id ?? '', charIndex)).toEqual([]);
	});

	it('fades nothing for a lesson the progression does not hold', () => {
		expect(fadedKeysFor(base, progression, progress, 'fr.lesson.nowhere', charIndex)).toEqual([]);
	});

	it('fades nothing when the progression has no rule for it', () => {
		const rules = { ...progression.rules };
		delete (rules as { keyboardFade?: unknown }).keyboardFade;
		const without = { ...progression, rules };
		expect(fadedKeysFor(base, without, progress, first?.id ?? '', charIndex)).toEqual([]);
	});
});
