import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../engine/graphemes';
import {
	createProfile,
	markCalibrated,
	parseProfile,
	renameProfile,
	updateSettings,
	withCompanion,
	withEarnedRewards,
	withGhost,
	withHelpQuest,
	withLastGame,
	withProgress
} from './profile';
import {
	companionArb,
	earnedRewardsArb,
	ghostArb,
	helpQuestRecordArb,
	nameArb,
	profileArb,
	progressArb,
	settingsPatchArb
} from './test-arbitraries';
import type { Profile } from './types';

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
				companionArb,
				ghostArb,
				earnedRewardsArb,
				helpQuestRecordArb,
				(profile, patch, progress, name, companion, ghost, earned, helpQuest) => {
					const snapshot = structuredClone(profile);
					deepFreeze(profile);
					deepFreeze(patch);
					deepFreeze(progress);
					deepFreeze(companion);
					deepFreeze(ghost);
					deepFreeze(earned);
					deepFreeze(helpQuest);
					renameProfile(profile, name);
					updateSettings(profile, patch);
					withProgress(profile, progress);
					markCalibrated(profile);
					withCompanion(profile, companion);
					withLastGame(profile, name, name);
					withGhost(profile, name, ghost);
					withEarnedRewards(profile, earned);
					withHelpQuest(profile, helpQuest);
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

	it('never loses an earned reward whatever is added, and keeps them without repeats', () => {
		fc.assert(
			fc.property(profileArb, earnedRewardsArb, earnedRewardsArb, (profile, first, second) => {
				const once = withEarnedRewards(profile, first);
				const twice = withEarnedRewards(once, second);
				for (const id of profile.earnedRewardIds) expect(twice.earnedRewardIds).toContain(id);
				for (const id of [...first, ...second]) expect(twice.earnedRewardIds).toContain(id);
				expect(new Set(twice.earnedRewardIds).size).toBe(twice.earnedRewardIds.length);
				expect(twice.earnedRewardIds.slice(0, profile.earnedRewardIds.length)).toEqual(
					profile.earnedRewardIds
				);
				expect(withEarnedRewards(twice, [...first, ...second])).toBe(twice);
				expect(parseProfile(toJson(twice))).toEqual(twice);
			})
		);
	});

	it('keeps the help quest through a JSON round trip, and replaces it only by a new one', () => {
		fc.assert(
			fc.property(profileArb, helpQuestRecordArb, (profile, record) => {
				const next = withHelpQuest(profile, record);
				expect(next.helpQuest).toEqual(record);
				expect(parseProfile(toJson(next))).toEqual(next);
				expect(next.earnedRewardIds).toBe(profile.earnedRewardIds);
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
			'progress',
			'companion',
			'lastGameByWorld',
			'ghosts',
			'earnedRewardIds',
			'helpQuest'
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
