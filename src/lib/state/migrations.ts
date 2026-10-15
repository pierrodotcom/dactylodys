import { parseProfile, PROFILE_SCHEMA_VERSION } from './profile';
import type { Profile, UnreadableProfile } from './types';

type StoredRecord = Readonly<Record<string, unknown>>;
type Migration = (record: StoredRecord) => StoredRecord;
type UnreadableReason = UnreadableProfile['reason'];

const FIRST_SCHEMA_VERSION = 1;

/** Stored data that no chain of migrations can bring to the current version. */
export class ProfileMigrationError extends Error {
	readonly reason: UnreadableReason;

	constructor(reason: UnreadableReason, message: string) {
		super(message);
		this.name = 'ProfileMigrationError';
		this.reason = reason;
	}
}

export type ProfileReading =
	| { readonly ok: true; readonly profile: Profile }
	| { readonly ok: false; readonly unreadable: UnreadableProfile };

function isRecord(value: unknown): value is StoredRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*
 * A step writes its defaults as literals and never reads those of the current code: what a
 * version 1 profile becomes must not change when the defaults of a later version do.
 * What the record already holds is kept, so that an unknown property stays a reason to refuse it.
 */
function toVersion2(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		companion: { name: '', colorId: null, wornItemIds: [] },
		lastGameByWorld: {},
		ghosts: {},
		...record,
		settings: isRecord(settings) ? { voiceEnabled: true, ...settings } : settings,
		schemaVersion: 2
	};
}

function isCount(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/*
 * A character starts with one recent play made of its lifetime totals, brought down to the 30
 * keystrokes the window of recent results covered when version 3 came out, at the same error rate.
 */
function firstRecentPlays(totals: StoredRecord): unknown[] {
	const attempts = totals['attempts'];
	const errors = totals['errors'];
	if (!isCount(attempts) || !isCount(errors) || attempts === 0) return [];
	const kept = Math.min(attempts, 30);
	return [{ attempts: kept, errors: Math.min(kept, Math.round((errors * kept) / attempts)) }];
}

function toVersion3(record: StoredRecord): StoredRecord {
	const progress = record['progress'];
	const chars = isRecord(progress) ? progress['chars'] : undefined;
	if (!isRecord(progress) || !isRecord(chars)) return { ...record, schemaVersion: 3 };
	const withRecentPlays = Object.entries(chars).map(([char, totals]) => [
		char,
		isRecord(totals) ? { recent: firstRecentPlays(totals), ...totals } : totals
	]);
	return {
		...record,
		progress: { ...progress, chars: Object.fromEntries(withRecentPlays) },
		schemaVersion: 3
	};
}

function toVersion4(record: StoredRecord): StoredRecord {
	const settings = record['settings'];
	return {
		...record,
		settings: isRecord(settings) ? { handGuide: 'auto', ...settings } : settings,
		schemaVersion: 4
	};
}

/** Keyed by the version a step starts from; each step leads to the version just after. */
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map([
	[FIRST_SCHEMA_VERSION, toVersion2],
	[2, toVersion3],
	[3, toVersion4]
]);

function versionOf(record: StoredRecord): number {
	const version = record['schemaVersion'];
	if (
		typeof version !== 'number' ||
		!Number.isSafeInteger(version) ||
		version < FIRST_SCHEMA_VERSION
	) {
		throw new ProfileMigrationError('invalid', 'profile.schemaVersion: expected a version number');
	}
	if (version > PROFILE_SCHEMA_VERSION) {
		throw new ProfileMigrationError(
			'newer-version',
			`profile.schemaVersion: ${version} is more recent than ${PROFILE_SCHEMA_VERSION}`
		);
	}
	return version;
}

/**
 * Brings stored data to the current version, one version at a time, without validating it:
 * `parseProfile` does that afterwards. Data already at the current version is returned as it is.
 * Throws a `ProfileMigrationError` for what is not a profile of a version this code knows.
 */
export function migrateProfile(data: unknown): unknown {
	if (!isRecord(data)) throw new ProfileMigrationError('invalid', 'profile: expected an object');
	let record = data;
	for (let version = versionOf(record); version < PROFILE_SCHEMA_VERSION; version++) {
		const step = MIGRATIONS.get(version);
		if (!step) {
			throw new ProfileMigrationError(
				'invalid',
				`profile.schemaVersion: no way up from ${version}`
			);
		}
		record = step(record);
	}
	return record;
}

function readText(data: unknown, key: string): string | null {
	if (!isRecord(data)) return null;
	const value = data[key];
	return typeof value === 'string' && value !== '' ? value : null;
}

/** Opens stored data of any known version; what cannot be opened is described, never thrown away. */
export function readProfile(data: unknown): ProfileReading {
	try {
		return { ok: true, profile: parseProfile(migrateProfile(data)) };
	} catch (error) {
		const reason = error instanceof ProfileMigrationError ? error.reason : 'invalid';
		return {
			ok: false,
			unreadable: { id: readText(data, 'id'), name: readText(data, 'name'), reason }
		};
	}
}
