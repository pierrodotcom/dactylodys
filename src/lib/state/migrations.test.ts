import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { migrateProfile, ProfileMigrationError, readProfile } from './migrations';
import {
	createProfile,
	markCalibrated,
	parseProfile,
	PROFILE_SCHEMA_VERSION,
	updateSettings,
	withProgress
} from './profile';
import { firstVersionProfileArb, profileArb } from './test-arbitraries';
import { asVersion1 } from './test-support';
import type { Profile } from './types';

type Json = Record<string, unknown>;

const toJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function playedProfile(): Profile {
	const created = createProfile({
		id: 'p-1',
		name: 'Léa',
		now: 1_700_000_000_000,
		platform: 'mac'
	});
	const tuned = updateSettings(markCalibrated(created), { soundEnabled: false, theme: 'dark' });
	return withProgress(tuned, {
		lessons: { 'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
		chars: { f: { attempts: 20, errors: 2 } }
	});
}

/** Written by hand, not derived from the code: what version 1 really left on devices. */
const STORED_BY_VERSION_1 = {
	schemaVersion: 1,
	id: 'p-1',
	name: 'Léa',
	createdAt: 1_700_000_000_000,
	calibrated: true,
	settings: {
		layoutId: 'fr-fr-azerty-mac',
		fingeringProfileId: 'ten-fingers-iso',
		soundEnabled: false,
		theme: 'dark',
		motion: 'system',
		textScale: 'md',
		textSpacing: 'normal',
		showKeyboard: true
	},
	progress: {
		lessons: { 'fr.lesson.x': { bestAccuracy: 96.5, stars: 2, attempts: 3, lastPlayedAt: 5 } },
		chars: { f: { attempts: 20, errors: 2 } }
	}
};

function reasonOf(data: unknown): unknown {
	try {
		migrateProfile(data);
	} catch (error) {
		if (error instanceof ProfileMigrationError) return error.reason;
		throw error;
	}
	return 'migrated';
}

describe('migrateProfile', () => {
	it('brings a version 1 profile to the current version with nothing lost', () => {
		expect(parseProfile(migrateProfile(STORED_BY_VERSION_1))).toEqual(playedProfile());
	});

	it('gives a migrated profile a companion without a name, no chosen game, no ghost, and the voice on', () => {
		const migrated = parseProfile(migrateProfile(STORED_BY_VERSION_1));
		expect(migrated.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
		expect(migrated.companion).toEqual({ name: '', colorId: null, wornItemIds: [] });
		expect(migrated.lastGameByWorld).toEqual({});
		expect(migrated.ghosts).toEqual({});
		expect(migrated.settings.voiceEnabled).toBe(true);
		expect(migrated.settings.soundEnabled).toBe(false);
	});

	it('does not alter the record it is given', () => {
		const stored = structuredClone(STORED_BY_VERSION_1);
		migrateProfile(stored);
		expect(stored).toEqual(STORED_BY_VERSION_1);
	});

	it('describes version 1 the way the test support does', () => {
		expect(asVersion1(playedProfile())).toEqual(STORED_BY_VERSION_1);
	});

	it('keeps the id, the name, the date, the settings and the progress of any version 1 profile', () => {
		fc.assert(
			fc.property(firstVersionProfileArb, (profile) => {
				const migrated = parseProfile(migrateProfile(toJson(asVersion1(profile))));
				expect(migrated.id).toBe(profile.id);
				expect(migrated.name).toBe(profile.name);
				expect(migrated.createdAt).toBe(profile.createdAt);
				expect(migrated.calibrated).toBe(profile.calibrated);
				expect(migrated.progress).toEqual(profile.progress);
				expect(migrated.settings).toEqual({ ...profile.settings, voiceEnabled: true });
			})
		);
	});

	it('leaves a profile of the current version as it is', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				const data = toJson(profile);
				expect(migrateProfile(data)).toEqual(profile);
				expect(parseProfile(migrateProfile(data))).toEqual(profile);
			})
		);
	});

	it('changes nothing when applied twice', () => {
		fc.assert(
			fc.property(firstVersionProfileArb, (profile) => {
				const once = migrateProfile(toJson(asVersion1(profile)));
				expect(migrateProfile(once)).toEqual(once);
			})
		);
	});

	it('does not make valid a version 1 record that carries something unknown', () => {
		const withExtra = { ...STORED_BY_VERSION_1, coins: 12 };
		const withBadCompanion = { ...STORED_BY_VERSION_1, companion: 'Pixel' };
		const withBadSetting = {
			...STORED_BY_VERSION_1,
			settings: { ...STORED_BY_VERSION_1.settings, voiceEnabled: 'loud' }
		};
		for (const data of [withExtra, withBadCompanion, withBadSetting]) {
			expect(() => parseProfile(migrateProfile(data))).toThrow();
		}
	});

	it('passes on damaged settings for the parser to refuse', () => {
		const data = { ...STORED_BY_VERSION_1, settings: 'none' };
		expect(() => parseProfile(migrateProfile(data))).toThrow(/profile\.settings/);
	});

	it('says that a profile of a later version is too recent', () => {
		expect(reasonOf({ ...STORED_BY_VERSION_1, schemaVersion: PROFILE_SCHEMA_VERSION + 1 })).toBe(
			'newer-version'
		);
		expect(reasonOf({ schemaVersion: 40 })).toBe('newer-version');
	});

	it.each<[string, unknown]>([
		['null', null],
		['a string', 'profile'],
		['a list', [STORED_BY_VERSION_1]],
		['no version', { id: 'a' }],
		['version zero', { ...STORED_BY_VERSION_1, schemaVersion: 0 }],
		['a negative version', { ...STORED_BY_VERSION_1, schemaVersion: -2 }],
		['a fractional version', { ...STORED_BY_VERSION_1, schemaVersion: 1.5 }],
		['a version as text', { ...STORED_BY_VERSION_1, schemaVersion: '1' }],
		['an endless version', { ...STORED_BY_VERSION_1, schemaVersion: Number.POSITIVE_INFINITY }]
	])('says that %s is invalid', (_label, data) => {
		expect(reasonOf(data)).toBe('invalid');
	});

	it('never fails in another way, whatever it is given', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(['migrated', 'newer-version', 'invalid']).toContain(reasonOf(data));
			})
		);
	});
});

describe('readProfile', () => {
	it('opens a profile of the current version', () => {
		const profile = playedProfile();
		expect(readProfile(toJson(profile))).toEqual({ ok: true, profile });
	});

	it('opens a version 1 profile as a profile of the current version', () => {
		expect(readProfile(STORED_BY_VERSION_1)).toEqual({ ok: true, profile: playedProfile() });
	});

	it('reports a profile of a later version with its id and its name', () => {
		const data = { ...(toJson(playedProfile()) as Json), schemaVersion: 3, badges: ['a'] };
		expect(readProfile(data)).toEqual({
			ok: false,
			unreadable: { id: 'p-1', name: 'Léa', reason: 'newer-version' }
		});
	});

	it('reports a damaged profile with what can still be read of it', () => {
		expect(readProfile({ ...STORED_BY_VERSION_1, settings: {} })).toEqual({
			ok: false,
			unreadable: { id: 'p-1', name: 'Léa', reason: 'invalid' }
		});
		expect(readProfile({ id: 'broken', name: 42 })).toEqual({
			ok: false,
			unreadable: { id: 'broken', name: null, reason: 'invalid' }
		});
		expect(readProfile({ schemaVersion: 1, id: '', name: '' })).toEqual({
			ok: false,
			unreadable: { id: null, name: null, reason: 'invalid' }
		});
	});

	it('reports what is not even an object', () => {
		for (const data of [null, undefined, 'profile', 12, []]) {
			expect(readProfile(data)).toEqual({
				ok: false,
				unreadable: { id: null, name: null, reason: 'invalid' }
			});
		}
	});

	it('never throws, whatever it is given', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(readProfile(data).ok).toBe(false);
			})
		);
	});
});
