import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ProgressState, StarCount } from '../engine/progression/types';
import { toGraphemes } from '../engine/graphemes';
import {
	createProfile,
	markCalibrated,
	parseProfile,
	renameProfile,
	updateSettings,
	withProgress
} from './profile';
import type { Profile, Settings } from './types';

const NAME_UNITS = ['a', 'B', 'é', 'é', ' ', '日', '\u{1F600}', '\u{1F468}‍\u{1F469}'];

const nameArb = fc
	.string({ unit: fc.constantFrom(...NAME_UNITS), minLength: 1, maxLength: 20 })
	.filter((name) => name.trim() !== '');

const timestampArb = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });
const countArb = fc.nat({ max: 100_000 });
const starsArb = fc.constantFrom<StarCount>(0, 1, 2, 3);
const accuracyArb = fc.integer({ min: 0, max: 1000 }).map((tenths) => tenths / 10);

const progressArb: fc.Arbitrary<ProgressState> = fc.record({
	lessons: fc.dictionary(
		fc.string({ maxLength: 12 }),
		fc.record({
			bestAccuracy: accuracyArb,
			stars: starsArb,
			attempts: countArb,
			lastPlayedAt: timestampArb
		}),
		{ maxKeys: 5 }
	),
	chars: fc.dictionary(
		fc.string({ maxLength: 4 }),
		fc.record({ attempts: countArb, errors: countArb }),
		{ maxKeys: 5 }
	)
});

const settingsPatchArb: fc.Arbitrary<Partial<Settings>> = fc.record(
	{
		layoutId: fc.constantFrom('fr-fr-azerty-pc', 'fr-fr-azerty-mac'),
		fingeringProfileId: fc.constant('ten-fingers-iso'),
		soundEnabled: fc.boolean(),
		theme: fc.constantFrom('system', 'light', 'dark'),
		motion: fc.constantFrom('system', 'reduced', 'full'),
		textScale: fc.constantFrom('md', 'lg', 'xl'),
		textSpacing: fc.constantFrom('normal', 'wide', 'wider'),
		showKeyboard: fc.boolean()
	},
	{ requiredKeys: [] }
);

const profileArb: fc.Arbitrary<Profile> = fc
	.record({
		id: fc.string({ minLength: 1, maxLength: 36 }),
		name: nameArb,
		now: timestampArb,
		platform: fc.constantFrom('pc', 'mac'),
		patch: settingsPatchArb,
		progress: progressArb,
		calibrated: fc.boolean()
	})
	.map(({ id, name, now, platform, patch, progress, calibrated }) => {
		const profile = withProgress(
			updateSettings(createProfile({ id, name, now, platform }), patch),
			progress
		);
		return calibrated ? markCalibrated(profile) : profile;
	});

function deepFreeze<T>(value: T): T {
	if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}

const toJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('profile properties', () => {
	it('never mutates its inputs', () => {
		fc.assert(
			fc.property(
				profileArb,
				settingsPatchArb,
				progressArb,
				nameArb,
				(profile, patch, progress, name) => {
					const snapshot = structuredClone(profile);
					deepFreeze(profile);
					deepFreeze(patch);
					deepFreeze(progress);
					renameProfile(profile, name);
					updateSettings(profile, patch);
					withProgress(profile, progress);
					markCalibrated(profile);
					expect(profile).toEqual(snapshot);
				}
			)
		);
	});

	it('survives a JSON round trip unchanged', () => {
		fc.assert(
			fc.property(profileArb, (profile) => {
				expect(parseProfile(toJson(profile))).toEqual(profile);
			})
		);
	});

	it('accepts every profile it creates and keeps the invariants of the name', () => {
		fc.assert(
			fc.property(fc.string({ unit: 'grapheme', maxLength: 40 }), (raw) => {
				let profile: Profile;
				try {
					profile = createProfile({ id: 'id', name: raw, now: 0, platform: 'pc' });
				} catch (error) {
					expect(error).toBeInstanceOf(RangeError);
					return;
				}
				const length = toGraphemes(profile.name).length;
				expect(length).toBeGreaterThanOrEqual(1);
				expect(length).toBeLessThanOrEqual(20);
				expect(profile.name).toBe(profile.name.normalize('NFC'));
				expect(profile.name).toBe(profile.name.trim());
				expect(parseProfile(toJson(profile))).toEqual(profile);
			})
		);
	});

	it('cleans a name idempotently', () => {
		fc.assert(
			fc.property(profileArb, nameArb, (profile, name) => {
				const once = renameProfile(profile, name);
				expect(renameProfile(once, once.name).name).toBe(once.name);
			})
		);
	});

	it('rejects any arbitrary value', () => {
		fc.assert(
			fc.property(fc.anything(), (data) => {
				expect(() => parseProfile(data)).toThrow();
			})
		);
	});

	it('rejects any arbitrary JSON object', () => {
		fc.assert(
			fc.property(fc.dictionary(fc.string(), fc.jsonValue()), (data) => {
				expect(() => parseProfile(data)).toThrow();
			})
		);
	});

	it('rejects a valid profile carrying an extra property', () => {
		fc.assert(
			fc.property(
				profileArb,
				fc.string({ minLength: 1 }),
				fc.jsonValue(),
				(profile, key, value) => {
					const data = { ...(toJson(profile) as Record<string, unknown>) };
					fc.pre(!Object.hasOwn(data, key));
					Object.defineProperty(data, key, { value, enumerable: true });
					expect(() => parseProfile(data)).toThrow();
				}
			)
		);
	});

	it('never coerces: a profile with one arbitrary field either fails or comes back identical', () => {
		const fields = [
			'schemaVersion',
			'id',
			'name',
			'createdAt',
			'calibrated',
			'settings',
			'progress'
		];
		fc.assert(
			fc.property(
				profileArb,
				fc.constantFrom(...fields),
				fc.anything(),
				(profile, field, value) => {
					const data = { ...(toJson(profile) as Record<string, unknown>), [field]: value };
					let parsed: Profile;
					try {
						parsed = parseProfile(data);
					} catch {
						return;
					}
					expect(parsed).toEqual(data);
				}
			)
		);
	});
});
