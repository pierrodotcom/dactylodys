import { describe, expect, it } from 'vitest';
import { applySettings, type SettingsRoot } from './apply-settings';
import { defaultSettings } from './profile';
import type { Settings } from './types';

function fakeRoot(initial: Record<string, string> = {}) {
	const attributes = new Map(Object.entries(initial));
	const root: SettingsRoot = {
		setAttribute: (name, value) => void attributes.set(name, value),
		removeAttribute: (name) => void attributes.delete(name)
	};
	return { root, attributes };
}

function settingsWith(patch: Partial<Settings>): Settings {
	return { ...defaultSettings('pc'), ...patch };
}

describe('applySettings', () => {
	it('leaves theme and motion absent when they follow the system', () => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ theme: 'system', motion: 'system' }), root);
		expect(attributes.has('data-theme')).toBe(false);
		expect(attributes.has('data-motion')).toBe(false);
	});

	it.each(['light', 'dark'] as const)('sets data-theme to %s', (theme) => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ theme }), root);
		expect(attributes.get('data-theme')).toBe(theme);
	});

	it.each(['reduced', 'full'] as const)('sets data-motion to %s', (motion) => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ motion }), root);
		expect(attributes.get('data-motion')).toBe(motion);
	});

	it.each(['md', 'lg', 'xl'] as const)('sets data-text-scale to %s', (textScale) => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ textScale }), root);
		expect(attributes.get('data-text-scale')).toBe(textScale);
	});

	it.each(['normal', 'wide', 'wider'] as const)('sets data-text-spacing to %s', (textSpacing) => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ textSpacing }), root);
		expect(attributes.get('data-text-spacing')).toBe(textSpacing);
	});

	it('removes stale theme and motion attributes when switching back to the system', () => {
		const { root, attributes } = fakeRoot({ 'data-theme': 'dark', 'data-motion': 'reduced' });
		applySettings(settingsWith({ theme: 'system', motion: 'system' }), root);
		expect(attributes.has('data-theme')).toBe(false);
		expect(attributes.has('data-motion')).toBe(false);
	});

	it('writes only the four documented attributes', () => {
		const { root, attributes } = fakeRoot();
		applySettings(settingsWith({ theme: 'dark', motion: 'full' }), root);
		expect([...attributes.keys()].sort()).toEqual([
			'data-motion',
			'data-text-scale',
			'data-text-spacing',
			'data-theme'
		]);
	});
});
