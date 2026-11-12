import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calmDown } from './calm';
import { defaultSettings } from './profile';
import { settingsPatchArb } from './test-arbitraries';
import type { Settings } from './types';

const base = defaultSettings('pc');

describe('calmDown', () => {
	it('reduces motion, cuts the light effects and the sounds of the game from the default settings', () => {
		expect(calmDown(base)).toEqual({
			patch: { motion: 'reduced', effects: false, soundEnabled: false },
			changes: ['motion', 'effects', 'sound']
		});
	});

	it('keeps the voice of the instructions and the background sound', () => {
		const settings: Settings = { ...base, voiceEnabled: true, ambience: 'soft-noise' };
		const { patch } = calmDown(settings);
		expect(patch).not.toHaveProperty('voiceEnabled');
		expect(patch).not.toHaveProperty('ambience');
	});

	it('changes only what is not calm yet, and says so', () => {
		const settings: Settings = { ...base, motion: 'reduced', soundEnabled: false };
		expect(calmDown(settings)).toEqual({ patch: { effects: false }, changes: ['effects'] });
	});

	it('changes nothing when everything is already calm', () => {
		const settings: Settings = { ...base, motion: 'reduced', effects: false, soundEnabled: false };
		expect(calmDown(settings)).toEqual({ patch: {}, changes: [] });
	});

	it('always leads to calm settings, and a second press changes nothing', () => {
		fc.assert(
			fc.property(settingsPatchArb, (patch) => {
				const settings = { ...base, ...patch };
				const calm = { ...settings, ...calmDown(settings).patch };
				expect(calm.motion).toBe('reduced');
				expect(calm.effects).toBe(false);
				expect(calm.soundEnabled).toBe(false);
				expect(calm.voiceEnabled).toBe(settings.voiceEnabled);
				expect(calm.ambience).toBe(settings.ambience);
				expect(calmDown(calm).changes).toEqual([]);
			})
		);
	});
});
