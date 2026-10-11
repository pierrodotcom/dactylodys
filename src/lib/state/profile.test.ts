import { describe, expect, it } from 'vitest';
import type { ProgressState } from '../engine/progression/types';
import {
	createProfile,
	defaultSettings,
	markCalibrated,
	MAX_NAME_LENGTH,
	MIN_NAME_LENGTH,
	parseProfile,
	renameProfile,
	updateSettings,
	withProgress
} from './profile';
import type { Profile, Settings } from './types';

const LESSON = 'fr.lesson.home-row-01';
const REMOVE = Symbol('remove');

const SAMPLE_PROGRESS: ProgressState = {
	lessons: { [LESSON]: { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
	chars: { f: { attempts: 20, errors: 2 } }
};

function sampleProfile(name = 'Léa'): Profile {
	return createProfile({ id: 'p-1', name, now: 1_700_000_000_000, platform: 'pc' });
}

type Json = { [key: string]: unknown };

function validData(): Json {
	return JSON.parse(JSON.stringify(withProgress(sampleProfile(), SAMPLE_PROGRESS))) as Json;
}

function mutate(path: readonly string[], value: unknown): Json {
	const data = validData();
	let target = data;
	for (const key of path.slice(0, -1)) target = target[key] as Json;
	const last = path[path.length - 1] ?? '';
	if (value === REMOVE) delete target[last];
	else target[last] = value;
	return data;
}

describe('defaultSettings', () => {
	it('picks the PC layout for the pc platform', () => {
		expect(defaultSettings('pc').layoutId).toBe('fr-fr-azerty-pc');
	});

	it('picks the Mac layout for the mac platform', () => {
		expect(defaultSettings('mac').layoutId).toBe('fr-fr-azerty-mac');
	});

	it('uses the ten-finger profile, sound on, system look, medium text and a visible keyboard', () => {
		expect(defaultSettings('pc')).toEqual({
			layoutId: 'fr-fr-azerty-pc',
			fingeringProfileId: 'ten-fingers-iso',
			soundEnabled: true,
			theme: 'system',
			motion: 'system',
			textScale: 'md',
			textSpacing: 'normal',
			showKeyboard: true
		});
	});
});

describe('createProfile', () => {
	it('builds an uncalibrated profile with empty progress and injected id and date', () => {
		expect(sampleProfile()).toEqual({
			schemaVersion: 1,
			id: 'p-1',
			name: 'Léa',
			createdAt: 1_700_000_000_000,
			calibrated: false,
			settings: defaultSettings('pc'),
			progress: { lessons: {}, chars: {} }
		});
	});

	it('uses the settings of the given platform', () => {
		const profile = createProfile({ id: 'p-2', name: 'Noé', now: 1, platform: 'mac' });
		expect(profile.settings.layoutId).toBe('fr-fr-azerty-mac');
	});

	it('trims the name', () => {
		expect(sampleProfile('  Léa \t').name).toBe('Léa');
	});

	it('converts the name to NFC', () => {
		expect(sampleProfile('Léa').name).toBe('Léa');
	});

	it('counts graphemes, not code units', () => {
		const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
		expect(sampleProfile(family.repeat(20)).name).toBe(family.repeat(20));
		expect(() => sampleProfile(family.repeat(21))).toThrow(RangeError);
	});

	it('exports the nickname bounds it enforces', () => {
		expect(sampleProfile('a'.repeat(MIN_NAME_LENGTH)).name).toHaveLength(MIN_NAME_LENGTH);
		expect(sampleProfile('a'.repeat(MAX_NAME_LENGTH)).name).toHaveLength(MAX_NAME_LENGTH);
		expect(() => sampleProfile('a'.repeat(MAX_NAME_LENGTH + 1))).toThrow(RangeError);
		expect(() => sampleProfile('a'.repeat(MIN_NAME_LENGTH - 1))).toThrow(RangeError);
	});

	it('accepts a name of exactly 20 characters and rejects 21', () => {
		expect(sampleProfile('a'.repeat(20)).name).toHaveLength(20);
		expect(() => sampleProfile('a'.repeat(21))).toThrow(RangeError);
	});

	it('rejects an empty name and a name of spaces', () => {
		expect(() => sampleProfile('')).toThrow(RangeError);
		expect(() => sampleProfile('   ')).toThrow(RangeError);
	});

	it('rejects a name containing a control character', () => {
		expect(() => sampleProfile('Lé\na')).toThrow(RangeError);
	});

	it('rejects an empty id and an invalid date', () => {
		const input = { id: 'x', name: 'Léa', now: 1, platform: 'pc' } as const;
		expect(() => createProfile({ ...input, id: '' })).toThrow(RangeError);
		expect(() => createProfile({ ...input, now: -1 })).toThrow(RangeError);
		expect(() => createProfile({ ...input, now: Number.NaN })).toThrow(RangeError);
	});

	it('returns a new settings and progress object for each profile', () => {
		const a = sampleProfile();
		const b = sampleProfile();
		expect(a.settings).not.toBe(b.settings);
		expect(a.progress).not.toBe(b.progress);
	});
});

describe('profile updates', () => {
	it('renames with the same cleaning rules', () => {
		const profile = sampleProfile();
		expect(renameProfile(profile, '  Zoé ').name).toBe('Zoé');
		expect(() => renameProfile(profile, '')).toThrow(RangeError);
		expect(() => renameProfile(profile, 'a'.repeat(21))).toThrow(RangeError);
	});

	it('updates only the patched settings', () => {
		const profile = sampleProfile();
		const updated = updateSettings(profile, { theme: 'dark', textScale: 'xl' });
		expect(updated.settings).toEqual({ ...profile.settings, theme: 'dark', textScale: 'xl' });
		expect(updated.name).toBe(profile.name);
		expect(updated.progress).toBe(profile.progress);
	});

	it('ignores undefined entries of the patch', () => {
		const profile = sampleProfile();
		expect(updateSettings(profile, { theme: undefined }).settings).toEqual(profile.settings);
	});

	it('rejects a patch that makes the settings invalid', () => {
		const profile = sampleProfile();
		const badTheme = { theme: 'purple' } as unknown as Partial<Settings>;
		const badLayout = { layoutId: 'xx-xx-qwerty-pc' } as unknown as Partial<Settings>;
		expect(() => updateSettings(profile, badTheme)).toThrow();
		expect(() => updateSettings(profile, badLayout)).toThrow();
	});

	it('replaces the progress', () => {
		expect(withProgress(sampleProfile(), SAMPLE_PROGRESS).progress).toEqual(SAMPLE_PROGRESS);
	});

	it('marks the profile as calibrated', () => {
		expect(markCalibrated(sampleProfile()).calibrated).toBe(true);
	});

	it('returns new profiles and leaves the original untouched', () => {
		const profile = sampleProfile();
		const snapshot = structuredClone(profile);
		const results = [
			renameProfile(profile, 'Zoé'),
			updateSettings(profile, { soundEnabled: false }),
			withProgress(profile, SAMPLE_PROGRESS),
			markCalibrated(profile)
		];
		for (const result of results) expect(result).not.toBe(profile);
		expect(profile).toEqual(snapshot);
	});
});

describe('parseProfile', () => {
	it('accepts a valid profile and returns an equal copy', () => {
		const data = validData();
		const parsed = parseProfile(data);
		expect(parsed).toEqual(data);
		expect(parsed).not.toBe(data);
		expect(parsed.settings).not.toBe(data['settings']);
	});

	it.each([
		['null', null],
		['a string', 'profile'],
		['an array', []],
		['a number', 3]
	])('rejects %s', (_label, data) => {
		expect(() => parseProfile(data)).toThrow(/profile: expected an object/);
	});

	it.each<[string, string[], unknown, RegExp]>([
		['a wrong schema version', ['schemaVersion'], 2, /schemaVersion/],
		['a missing id', ['id'], REMOVE, /profile\.id/],
		['an empty id', ['id'], '', /profile\.id/],
		['a numeric id', ['id'], 4, /profile\.id/],
		['an empty name', ['name'], '', /profile\.name/],
		['an untrimmed name', ['name'], ' Léa', /profile\.name/],
		['a decomposed name', ['name'], 'Léa', /profile\.name/],
		['a too long name', ['name'], 'a'.repeat(21), /profile\.name/],
		['a non-string name', ['name'], 12, /profile\.name/],
		['a negative date', ['createdAt'], -5, /createdAt/],
		['a fractional date', ['createdAt'], 1.5, /createdAt/],
		['a string date', ['createdAt'], '2026-01-01', /createdAt/],
		['a non-boolean calibrated', ['calibrated'], 'yes', /calibrated/],
		['an unknown property', ['extra'], 1, /profile\.extra/],
		['missing settings', ['settings'], REMOVE, /profile\.settings/],
		['an unknown layout', ['settings', 'layoutId'], 'xx-xx-qwerty-pc', /layoutId/],
		['an unknown fingering profile', ['settings', 'fingeringProfileId'], 'two', /fingering/],
		['a non-boolean sound flag', ['settings', 'soundEnabled'], 1, /soundEnabled/],
		['an unknown theme', ['settings', 'theme'], 'purple', /theme/],
		['an unknown motion', ['settings', 'motion'], 'none', /motion/],
		['an unknown text scale', ['settings', 'textScale'], 'sm', /textScale/],
		['an unknown text spacing', ['settings', 'textSpacing'], 'tight', /textSpacing/],
		['a non-boolean keyboard flag', ['settings', 'showKeyboard'], null, /showKeyboard/],
		['an unknown setting', ['settings', 'volume'], 3, /settings\.volume/],
		['a missing setting', ['settings', 'theme'], REMOVE, /settings\.theme/],
		['missing progress', ['progress'], REMOVE, /profile\.progress/],
		['a progress array', ['progress'], [], /profile\.progress/],
		['an unknown progress property', ['progress', 'badges'], {}, /progress\.badges/],
		['an accuracy above 100', ['progress', 'lessons', LESSON, 'bestAccuracy'], 101, /bestAccuracy/],
		['a negative accuracy', ['progress', 'lessons', LESSON, 'bestAccuracy'], -1, /bestAccuracy/],
		['four stars', ['progress', 'lessons', LESSON, 'stars'], 4, /stars/],
		['fractional attempts', ['progress', 'lessons', LESSON, 'attempts'], 1.5, /attempts/],
		['a negative play date', ['progress', 'lessons', LESSON, 'lastPlayedAt'], -1, /lastPlayedAt/],
		['a missing lesson field', ['progress', 'lessons', LESSON, 'stars'], REMOVE, /stars/],
		['a non-object lesson', ['progress', 'lessons', LESSON], 3, /home-row-01/],
		['negative char errors', ['progress', 'chars', 'f', 'errors'], -1, /errors/],
		['a non-numeric char count', ['progress', 'chars', 'f', 'attempts'], '20', /attempts/]
	])('rejects %s', (_label, path, value, message) => {
		expect(() => parseProfile(mutate(path, value))).toThrow(message);
	});

	it('keeps a progress key named __proto__ as plain data', () => {
		const json = JSON.stringify(validData()).replace(
			'"chars":{',
			'"chars":{"__proto__":{"attempts":1,"errors":0},'
		);
		const parsed = parseProfile(JSON.parse(json));
		expect(Object.keys(parsed.progress.chars)).toContain('__proto__');
		expect(Object.getPrototypeOf(parsed.progress.chars)).toBe(Object.prototype);
	});
});
