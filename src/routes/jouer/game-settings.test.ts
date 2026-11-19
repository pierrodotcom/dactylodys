import { describe, expect, it } from 'vitest';
import { emptyProgress } from '$lib/engine/progression/progress';
import type { ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { defaultSettings, updateSettings, createProfile } from '$lib/state/profile';
import type { GameGuide } from '$lib/games/types';
import azertyPc from '../../../layouts/fr-fr-azerty-pc.json';
import { progressionFor } from './content';
import { fadedKeysFor, hesitationFor, isMotionReduced, toGameSettings } from './game-settings';

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

	it('lets the worlds decide by default, and waits for the right key outside the lessons', () => {
		expect(base.errorPolicy).toBe('world');
		expect(toGameSettings(base, false, NO_GUIDE).errorPolicy).toBe('retry');
	});

	it('passes the choice of the adult for every world through', () => {
		const always = { ...base, errorPolicy: 'backspace' as const };
		expect(toGameSettings(always, false, NO_GUIDE).errorPolicy).toBe('backspace');
		const never = { ...base, errorPolicy: 'retry' as const };
		expect(toGameSettings(never, false, NO_GUIDE).errorPolicy).toBe('retry');
	});

	it('takes what the route found for the lesson played', () => {
		expect(toGameSettings(base, false, NO_GUIDE, undefined, [], [], 'backspace').errorPolicy).toBe(
			'backspace'
		);
		const always = { ...base, errorPolicy: 'backspace' as const };
		expect(toGameSettings(always, false, NO_GUIDE, undefined, [], [], 'retry').errorPolicy).toBe(
			'retry'
		);
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
		expect(toGameSettings(base, false, NO_GUIDE, undefined, scenes).scenes).toEqual(scenes);
		const calm = { ...base, effects: false, motion: 'full' as const };
		expect(toGameSettings(calm, false, NO_GUIDE, undefined, scenes).scenes).toEqual([]);
		expect(toGameSettings(calm, false, NO_GUIDE, undefined, scenes).reducedMotion).toBe(false);
	});

	it('fades no key unless the route says which', () => {
		expect(toGameSettings(base, false, NO_GUIDE).fadedKeys).toEqual([]);
		expect(toGameSettings(base, false, NO_GUIDE, undefined, [], ['KeyF']).fadedKeys).toEqual([
			'KeyF'
		]);
	});

	it('passes the age group of the child to the game, for its bubbles', () => {
		expect(toGameSettings(base, false, NO_GUIDE).ageBand).toBe('8-9');
		expect(toGameSettings({ ...base, ageBand: '10-12' }, false, NO_GUIDE).ageBand).toBe('10-12');
	});

	it('passes the colours of the keyboard chosen by the child to the game', () => {
		expect(toGameSettings(base, false, NO_GUIDE).keyboardColors).toBe('all');
		expect(
			toGameSettings({ ...base, keyboardColors: 'finger' }, false, NO_GUIDE).keyboardColors
		).toBe('finger');
	});

	it('passes the reminder to look at the screen through, and none unless given', () => {
		const lookReminder = { firstAfterChars: 20, everyChars: 40 };
		expect(toGameSettings(base, false, NO_GUIDE, lookReminder).lookReminder).toEqual(lookReminder);
		expect(toGameSettings(base, false, NO_GUIDE)).not.toHaveProperty('lookReminder');
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

describe('hesitationFor (audit P-07)', () => {
	const progression = progressionFor('fr-fr-azerty-pc');
	if (progression === undefined) throw new Error('no progression for AZERTY PC');
	const charIndex = buildCharIndex(parseLayout(azertyPc));
	const rules = progression.rules.handGuide;
	const shortest = rules?.hesitationMs ?? 0;

	/** A child measured on enough keys, each with enough right keystrokes, this long before each. */
	function measured(latencyMs: number): ProgressState {
		const keys = [...'fjdkslei'].slice(0, rules?.hesitationMinKeys ?? 0);
		const correct = rules?.hesitationMinCorrect ?? 0;
		const sample = { attempts: correct, errors: 0, latencyMs };
		return {
			lessons: {},
			chars: Object.fromEntries(
				keys.map((char) => [char, { attempts: correct, errors: 0, recent: [sample] }])
			)
		};
	}

	it('follows the time of the progression: a shortest wait and a factor of the time of the child', () => {
		expect(shortest).toBeGreaterThan(0);
		expect(rules?.hesitationFactor).toBeGreaterThanOrEqual(1);
	});

	it('waits the shortest time for a child not measured yet', () => {
		expect(hesitationFor(progression, emptyProgress(), charIndex)).toBe(shortest);
	});

	it('waits longer for a child who takes long on every key lately', () => {
		const slow = shortest * 2;
		expect(hesitationFor(progression, measured(slow), charIndex)).toBe(
			slow * (rules?.hesitationFactor ?? 0)
		);
	});

	it('never waits less than the shortest time for a quick child', () => {
		expect(hesitationFor(progression, measured(shortest / 10), charIndex)).toBe(shortest);
	});

	it('waits the shortest time while the keys of the layout are not loaded', () => {
		expect(hesitationFor(progression, measured(shortest * 2), undefined)).toBe(shortest);
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
