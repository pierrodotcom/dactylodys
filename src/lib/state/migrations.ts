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

/** Keyed by the version a step starts from; each step leads to the version just after. */
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map([[FIRST_SCHEMA_VERSION, toVersion2]]);

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
