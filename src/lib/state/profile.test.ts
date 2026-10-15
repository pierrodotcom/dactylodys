import { describe, expect, it } from 'vitest';
import type { GhostRun } from '../engine/ghost/types';
import type { ProgressState } from '../engine/progression/types';
import {
	createProfile,
	defaultSettings,
	markCalibrated,
	MAX_NAME_LENGTH,
	MIN_NAME_LENGTH,
	parseProfile,
	PROFILE_SCHEMA_VERSION,
	renameProfile,
	updateSettings,
	withCompanion,
	withGhost,
	withLastGame,
	withProgress
} from './profile';
import type { CompanionChoice, Profile, Settings } from './types';

const LESSON = 'fr.lesson.home-row-01';
const WORLD = 'fr.world.garden';
const REMOVE = Symbol('remove');

const SAMPLE_PROGRESS: ProgressState = {
	lessons: { [LESSON]: { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
	chars: {
		f: {
			attempts: 20,
			errors: 2,
			recent: [
				{ attempts: 12, errors: 2 },
				{ attempts: 8, errors: 0 }
			]
		}
	}
};

const RECENT = ['progress', 'chars', 'f', 'recent'] as const;

function sample(attempts: number, errors: number) {
	return { attempts, errors };
}

const SAMPLE_GHOST: GhostRun = {
	recordedAt: 7,
	charCount: 12,
	activeMs: 3000,
	points: [
		{ correctChars: 5, activeMs: 1000 },
		{ correctChars: 12, activeMs: 3000 }
	]
};

const SAMPLE_COMPANION: CompanionChoice = {
	name: 'Pixel',
	colorId: 'moss',
	wornItemIds: ['fr.reward.scarf', 'fr.reward.hat']
};

function sampleProfile(name = 'Léa'): Profile {
	return createProfile({ id: 'p-1', name, now: 1_700_000_000_000, platform: 'pc' });
}

function fullProfile(): Profile {
	const played = withProgress(sampleProfile(), SAMPLE_PROGRESS);
	const dressed = withCompanion(played, SAMPLE_COMPANION);
	return withGhost(withLastGame(dressed, WORLD, 'rocket'), LESSON, SAMPLE_GHOST);
}

type Json = { [key: string]: unknown };

function validData(): Json {
	return JSON.parse(JSON.stringify(fullProfile())) as Json;
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

	it('uses the ten-finger profile, sound and voice on, system look, medium text, a visible keyboard and the hand of the lessons', () => {
		expect(defaultSettings('pc')).toEqual({
			layoutId: 'fr-fr-azerty-pc',
			fingeringProfileId: 'ten-fingers-iso',
			soundEnabled: true,
			voiceEnabled: true,
			theme: 'system',
			motion: 'system',
			textScale: 'md',
			textSpacing: 'normal',
			showKeyboard: true,
			handGuide: 'auto'
		});
	});
});

describe('createProfile', () => {
	it('builds an uncalibrated profile with empty progress and injected id and date', () => {
		expect(sampleProfile()).toEqual({
			schemaVersion: 4,
			id: 'p-1',
			name: 'Léa',
			createdAt: 1_700_000_000_000,
			calibrated: false,
			settings: defaultSettings('pc'),
			progress: { lessons: {}, chars: {} },
			companion: { name: '', colorId: null, wornItemIds: [] },
			lastGameByWorld: {},
			ghosts: {}
		});
	});

	it('writes the current schema version', () => {
		expect(sampleProfile().schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
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

	it('returns new objects for each profile', () => {
		const a = sampleProfile();
		const b = sampleProfile();
		expect(a.settings).not.toBe(b.settings);
		expect(a.progress).not.toBe(b.progress);
		expect(a.companion).not.toBe(b.companion);
		expect(a.companion.wornItemIds).not.toBe(b.companion.wornItemIds);
		expect(a.lastGameByWorld).not.toBe(b.lastGameByWorld);
		expect(a.ghosts).not.toBe(b.ghosts);
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

	it('turns the voice off without touching the sounds', () => {
		const updated = updateSettings(sampleProfile(), { voiceEnabled: false });
		expect(updated.settings.voiceEnabled).toBe(false);
		expect(updated.settings.soundEnabled).toBe(true);
	});

	it('keeps the choices made for the companion', () => {
		expect(withCompanion(sampleProfile(), SAMPLE_COMPANION).companion).toEqual(SAMPLE_COMPANION);
	});

	it('cleans the name of the companion like a nickname', () => {
		const named = (name: string) =>
			withCompanion(sampleProfile(), { ...SAMPLE_COMPANION, name }).companion.name;
		expect(named('  Pixel \t')).toBe('Pixel');
		expect(named('Ze\u0301phyr')).toBe('Z\u00e9phyr');
		expect(named('a'.repeat(MAX_NAME_LENGTH))).toHaveLength(MAX_NAME_LENGTH);
		expect(() => named('a'.repeat(MAX_NAME_LENGTH + 1))).toThrow(RangeError);
		expect(() => named('Pi\nxel')).toThrow(RangeError);
	});

	it('lets the companion go back to no name', () => {
		const unnamed = { ...SAMPLE_COMPANION, name: '   ' };
		expect(withCompanion(sampleProfile(), unnamed).companion.name).toBe('');
	});

	it('does not check the identifiers of the companion against any catalogue', () => {
		const choice = { name: '', colorId: 'no-such-colour', wornItemIds: ['no-such-item'] };
		expect(withCompanion(sampleProfile(), choice).companion).toEqual(choice);
	});

	it.each<[string, Partial<CompanionChoice>]>([
		['an empty colour', { colorId: '' }],
		['an empty item', { wornItemIds: [''] }],
		['an item worn twice', { wornItemIds: ['fr.reward.hat', 'fr.reward.hat'] }]
	])('rejects a companion with %s', (_label, patch) => {
		expect(() => withCompanion(sampleProfile(), { ...SAMPLE_COMPANION, ...patch })).toThrow();
	});

	it('remembers the game chosen in a world and keeps those of the other worlds', () => {
		const first = withLastGame(sampleProfile(), WORLD, 'rocket');
		const second = withLastGame(first, 'fr.world.kitchen', 'recipe');
		expect(withLastGame(second, WORLD, 'hatching').lastGameByWorld).toEqual({
			[WORLD]: 'hatching',
			'fr.world.kitchen': 'recipe'
		});
		expect(() => withLastGame(first, WORLD, '')).toThrow(RangeError);
	});

	it('replaces the ghost of a lesson and keeps those of the other lessons', () => {
		const later = { ...SAMPLE_GHOST, recordedAt: 8 };
		const first = withGhost(sampleProfile(), LESSON, SAMPLE_GHOST);
		const second = withGhost(withGhost(first, 'fr.lesson.other', SAMPLE_GHOST), LESSON, later);
		expect(second.ghosts).toEqual({ [LESSON]: later, 'fr.lesson.other': SAMPLE_GHOST });
	});

	it('rejects a ghost that could not be stored', () => {
		expect(() => withGhost(sampleProfile(), LESSON, { ...SAMPLE_GHOST, charCount: 3 })).toThrow();
	});

	it('is not fooled by a world or a lesson named like an object property', () => {
		const profile = withGhost(
			withLastGame(sampleProfile(), '__proto__', 'rocket'),
			'__proto__',
			SAMPLE_GHOST
		);
		expect(Object.keys(profile.lastGameByWorld)).toEqual(['__proto__']);
		expect(Object.keys(profile.ghosts)).toEqual(['__proto__']);
		expect(parseProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
	});

	it('returns new profiles and leaves the original untouched', () => {
		const profile = sampleProfile();
		const snapshot = structuredClone(profile);
		const results = [
			renameProfile(profile, 'Zoé'),
			updateSettings(profile, { soundEnabled: false }),
			withProgress(profile, SAMPLE_PROGRESS),
			markCalibrated(profile),
			withCompanion(profile, SAMPLE_COMPANION),
			withLastGame(profile, WORLD, 'rocket'),
			withGhost(profile, LESSON, SAMPLE_GHOST)
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
		expect(parsed.companion).not.toBe(data['companion']);
		expect(parsed.ghosts[LESSON]).not.toBe((data['ghosts'] as Json)[LESSON]);
	});

	it('accepts a companion that has no name yet', () => {
		expect(parseProfile(mutate(['companion', 'name'], '')).companion.name).toBe('');
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
		['the first schema version', ['schemaVersion'], 1, /schemaVersion/],
		['the schema version before', ['schemaVersion'], 3, /schemaVersion/],
		['the schema version after', ['schemaVersion'], 5, /schemaVersion/],
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
		['a non-boolean voice flag', ['settings', 'voiceEnabled'], 'on', /voiceEnabled/],
		['a missing voice flag', ['settings', 'voiceEnabled'], REMOVE, /settings\.voiceEnabled/],
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
		['a non-numeric char count', ['progress', 'chars', 'f', 'attempts'], '20', /attempts/],
		['a character without recent plays', [...RECENT], REMOVE, /chars\.f\.recent/],
		['recent plays that are not a list', [...RECENT], {}, /chars\.f\.recent/],
		['a recent play that is not an object', [...RECENT], [3], /recent\[0\]/],
		['a recent play without keystroke', [...RECENT], [sample(0, 0)], /recent\[0\]\.attempts/],
		['a fractional recent play', [...RECENT], [sample(1.5, 0)], /recent\[0\]\.attempts/],
		['recent errors below zero', [...RECENT], [sample(4, -1)], /recent\[0\]\.errors/],
		[
			'more recent errors than keystrokes',
			[...RECENT],
			[sample(4, 1), sample(2, 3)],
			/recent\[1\]\.errors/
		],
		['a recent play without errors', [...RECENT], [{ attempts: 3 }], /recent\[0\]\.errors/],
		[
			'a recent play with an unknown property',
			[...RECENT],
			[{ ...sample(3, 0), playedAt: 5 }],
			/recent\[0\]\.playedAt/
		],
		['a missing companion', ['companion'], REMOVE, /profile\.companion/],
		['a companion that is a list', ['companion'], [], /profile\.companion/],
		['an unknown companion property', ['companion', 'mood'], 'happy', /companion\.mood/],
		['a missing companion name', ['companion', 'name'], REMOVE, /companion\.name/],
		['an untrimmed companion name', ['companion', 'name'], 'Pixel ', /companion\.name/],
		['a too long companion name', ['companion', 'name'], 'a'.repeat(21), /companion\.name/],
		['a numeric companion name', ['companion', 'name'], 5, /companion\.name/],
		['an empty colour', ['companion', 'colorId'], '', /companion\.colorId/],
		['a numeric colour', ['companion', 'colorId'], 3, /companion\.colorId/],
		['a missing colour', ['companion', 'colorId'], REMOVE, /companion\.colorId/],
		['worn items that are not a list', ['companion', 'wornItemIds'], 'hat', /wornItemIds/],
		['an empty worn item', ['companion', 'wornItemIds'], [''], /wornItemIds\[0\]/],
		['a numeric worn item', ['companion', 'wornItemIds'], ['a', 2], /wornItemIds\[1\]/],
		['an item worn twice', ['companion', 'wornItemIds'], ['a', 'a'], /wornItemIds\[1\]/],
		['missing chosen games', ['lastGameByWorld'], REMOVE, /profile\.lastGameByWorld/],
		['chosen games that are a list', ['lastGameByWorld'], [], /profile\.lastGameByWorld/],
		['an empty chosen game', ['lastGameByWorld', WORLD], '', /lastGameByWorld/],
		['a numeric chosen game', ['lastGameByWorld', WORLD], 4, /lastGameByWorld/],
		['missing ghosts', ['ghosts'], REMOVE, /profile\.ghosts/],
		['ghosts that are a list', ['ghosts'], [], /profile\.ghosts/],
		['a ghost that is not an object', ['ghosts', LESSON], 12, /profile\.ghosts\./],
		['a ghost without points', ['ghosts', LESSON, 'points'], [], /profile\.ghosts\..*points/],
		['a ghost with an unknown property', ['ghosts', LESSON, 'text'], 'fj', /ghosts\..*text/]
	])('rejects %s', (_label, path, value, message) => {
		expect(() => parseProfile(mutate(path, value))).toThrow(message);
	});

	it('accepts a character that has no recent play, and one whose every recent keystroke was wrong', () => {
		expect(parseProfile(mutate([...RECENT], [])).progress.chars['f']?.recent).toEqual([]);
		const wrong = [sample(5, 5)];
		expect(parseProfile(mutate([...RECENT], wrong)).progress.chars['f']?.recent).toEqual(wrong);
	});

	it('returns recent plays that do not share anything with the data', () => {
		const data = validData();
		const parsed = parseProfile(data);
		const given = ((data['progress'] as Json)['chars'] as Json)['f'] as Json;
		expect(parsed.progress.chars['f']?.recent).not.toBe(given['recent']);
		expect(parsed.progress.chars['f']?.recent[0]).not.toBe((given['recent'] as unknown[])[0]);
	});

	it('keeps a progress key named __proto__ as plain data', () => {
		const json = JSON.stringify(validData()).replace(
			'"chars":{',
			'"chars":{"__proto__":{"attempts":1,"errors":0,"recent":[]},'
		);
		const parsed = parseProfile(JSON.parse(json));
		expect(Object.keys(parsed.progress.chars)).toContain('__proto__');
		expect(Object.getPrototypeOf(parsed.progress.chars)).toBe(Object.prototype);
	});
});
