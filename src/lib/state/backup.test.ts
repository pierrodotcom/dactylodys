import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	applyImport,
	BACKUP_FORMAT_ID,
	BACKUP_FORMAT_VERSION,
	backupFileName,
	exportBackup,
	planImport,
	type ImportPlan,
	type ImportReady
} from './backup';
import { withSessionRecorded } from './journal';
import { JOURNAL_RULES } from './journal-rules';
import { createProfile, PROFILE_SCHEMA_VERSION, renameProfile, withProgress } from './profile';
import {
	profileArb,
	realisticInstantArb,
	sessionRecordArb,
	utcOffsetArb
} from './test-arbitraries';
import { asVersion1, asVersion4, asVersion7, withUnknownLatency } from './test-support';
import type { Profile } from './types';

type Json = Record<string, unknown>;

const EXPORTED_AT = Date.UTC(2026, 10, 4, 23, 30);
const FORBIDDEN = /[<>:"/\\|?*\p{Cc}]/u;

function child(id: string, name: string): Profile {
	return createProfile({ id, name, now: 1_700_000_000_000, platform: 'pc' });
}

const LEA = child('p-1', 'Léa');
const NOE = child('p-2', 'Noé');

function backupOf(content: Json): string {
	return JSON.stringify({
		format: BACKUP_FORMAT_ID,
		formatVersion: BACKUP_FORMAT_VERSION,
		exportedAt: EXPORTED_AT,
		profiles: [LEA],
		...content
	});
}

function ready(plan: ImportPlan): ImportReady {
	if (!plan.ok) throw new Error(`refused: ${plan.reason}`);
	return plan;
}

function counter(prefix: string): () => string {
	let next = 0;
	return () => `${prefix}${++next}`;
}

const profilesArb = fc.uniqueArray(profileArb, {
	maxLength: 3,
	selector: (profile) => profile.id
});

describe('exportBackup', () => {
	it('writes the technical format, its version, the date and the profiles', () => {
		const played = withSessionRecorded(
			LEA,
			{
				lessonId: 'fr.lesson.x',
				gameId: 'rocket',
				finishedAt: EXPORTED_AT,
				utcOffsetMinutes: 60,
				durationMs: 1000,
				totalKeystrokes: 3,
				correctKeystrokes: 3,
				errorCount: 0,
				accuracy: 100,
				correctCharsPerMinute: 180,
				stars: 3,
				passed: true
			},
			JOURNAL_RULES
		);
		expect(JSON.parse(exportBackup([played, NOE], EXPORTED_AT))).toEqual({
			format: 'dactylodys-backup',
			formatVersion: 1,
			exportedAt: EXPORTED_AT,
			profiles: [played, NOE]
		});
	});

	it('refuses a date that is not a timestamp and two profiles with the same id', () => {
		expect(() => exportBackup([LEA], -1)).toThrow(RangeError);
		expect(() => exportBackup([LEA], 1.5)).toThrow(RangeError);
		expect(() => exportBackup([LEA, renameProfile(LEA, 'Zoé')], EXPORTED_AT)).toThrow(RangeError);
	});

	it('refuses to write a damaged profile', () => {
		const damaged = { ...LEA, practiceDays: ['hier'] };
		expect(() => exportBackup([damaged], EXPORTED_AT)).toThrow(/practiceDays/);
	});

	it('gives back, once loaded on an empty device, exactly the profiles it was given', () => {
		fc.assert(
			fc.property(profilesArb, realisticInstantArb, (profiles, now) => {
				const plan = ready(planImport(exportBackup(profiles, now), []));
				expect(plan.exportedAt).toBe(now);
				expect(plan.importable).toEqual(profiles);
				expect(plan.conflicts).toEqual([]);
				const imported = applyImport(plan, {}, () => {
					throw new Error('no id needed');
				});
				expect(imported).toEqual(profiles.map((profile) => ({ profile, copyOf: null })));
			})
		);
	});

	it('gives back, on the device it came from, every profile as a conflict with itself', () => {
		fc.assert(
			fc.property(profilesArb, (profiles) => {
				const plan = ready(planImport(exportBackup(profiles, EXPORTED_AT), profiles));
				expect(plan.importable).toEqual([]);
				expect(plan.conflicts).toEqual(
					profiles.map((profile) => ({ incoming: profile, existing: profile }))
				);
			})
		);
	});
});

describe('backupFileName', () => {
	it('puts together the prefix, the nickname and the local date', () => {
		const at = { exportedAt: EXPORTED_AT, utcOffsetMinutes: 60 };
		expect(backupFileName({ prefix: 'DactyloDys', playerName: 'Léa', ...at })).toBe(
			'DactyloDys-Léa-2026-11-05.json'
		);
		expect(
			backupFileName({ prefix: 'DactyloDys', playerName: null, ...at, utcOffsetMinutes: 0 })
		).toBe('DactyloDys-2026-11-04.json');
	});

	it('replaces what Windows or macOS refuse in a file name', () => {
		const name = backupFileName({
			prefix: 'Dactylo:Dys',
			playerName: ' ..Lé/a* "le\\roi"?<>|\u0007. ',
			exportedAt: EXPORTED_AT,
			utcOffsetMinutes: 0
		});
		expect(name).toBe('Dactylo-Dys-Lé-a- -le-roi--2026-11-04.json');
	});

	it('leaves out a part that is left empty', () => {
		expect(
			backupFileName({
				prefix: ' . ',
				playerName: '',
				exportedAt: EXPORTED_AT,
				utcOffsetMinutes: 0
			})
		).toBe('2026-11-04.json');
	});

	it('always gives a name Windows and macOS accept', () => {
		fc.assert(
			fc.property(
				fc.string(),
				fc.option(fc.string(), { nil: null }),
				realisticInstantArb,
				utcOffsetArb,
				(prefix, playerName, exportedAt, utcOffsetMinutes) => {
					const name = backupFileName({ prefix, playerName, exportedAt, utcOffsetMinutes });
					expect(name).toMatch(/\d{4}-\d{2}-\d{2}\.json$/);
					expect(name).not.toMatch(FORBIDDEN);
					expect(name).not.toMatch(/^[.\s]/);
				}
			)
		);
	});
});

describe('planImport', () => {
	it.each<[string, string]>([
		['an empty file', ''],
		['a text', 'Bonjour'],
		['a list', '[1, 2]'],
		['a number', '12'],
		['null', 'null'],
		['another format', JSON.stringify({ format: 'other-app', formatVersion: 1, profiles: [] })],
		['an object without format', JSON.stringify({ profiles: [LEA] })],
		['a profile alone', JSON.stringify(LEA)]
	])('says that %s is not a backup', (_label, text) => {
		expect(planImport(text, [])).toEqual({ ok: false, reason: 'not-a-backup' });
	});

	it.each<[string, string]>([
		['a later version of the file', backupOf({ formatVersion: BACKUP_FORMAT_VERSION + 1 })],
		[
			'a profile of a later version',
			backupOf({ profiles: [NOE, { ...LEA, schemaVersion: PROFILE_SCHEMA_VERSION + 1 }] })
		],
		[
			'a profile of a later version beside a damaged one',
			backupOf({ profiles: [{ id: 'x' }, { ...LEA, schemaVersion: PROFILE_SCHEMA_VERSION + 1 }] })
		],
		['a later file whatever it holds', backupOf({ formatVersion: 40, profiles: 'later', more: 1 })]
	])('refuses %s as too recent', (_label, text) => {
		expect(planImport(text, [])).toEqual({ ok: false, reason: 'newer-version' });
	});

	it.each<[string, string]>([
		['a version as text', backupOf({ formatVersion: '1' })],
		['a version zero', backupOf({ formatVersion: 0 })],
		['a fractional version', backupOf({ formatVersion: 1.5 })],
		['an unknown property', backupOf({ comment: 'mine' })],
		['no date', backupOf({ exportedAt: undefined })],
		['a negative date', backupOf({ exportedAt: -3 })],
		['profiles that are not a list', backupOf({ profiles: { a: LEA } })],
		['no profiles', backupOf({ profiles: undefined })],
		['a damaged profile', backupOf({ profiles: [NOE, { ...LEA, name: '' }] })],
		['a profile that is not an object', backupOf({ profiles: [NOE, 'Léa'] })],
		['the same child twice', backupOf({ profiles: [LEA, renameProfile(LEA, 'Zoé')] })],
		['a file cut short', exportBackup([LEA, NOE], EXPORTED_AT).slice(0, 120)]
	])('refuses %s as damaged', (_label, text) => {
		expect(planImport(text, [])).toEqual({ ok: false, reason: 'invalid' });
	});

	it('refuses a file cut short anywhere, as damaged once its format can be read', () => {
		const text = exportBackup([LEA, NOE], EXPORTED_AT);
		const formatEnd = text.indexOf(JSON.stringify(BACKUP_FORMAT_ID)) + BACKUP_FORMAT_ID.length + 2;
		fc.assert(
			fc.property(fc.integer({ min: 0, max: text.length - 1 }), (length) => {
				const plan = planImport(text.slice(0, length), []);
				expect(plan).toEqual({
					ok: false,
					reason: length >= formatEnd ? 'invalid' : 'not-a-backup'
				});
			})
		);
	});

	it('never throws and never accepts an arbitrary text', () => {
		fc.assert(
			fc.property(fc.string(), (text) => {
				expect(planImport(text, []).ok).toBe(false);
			})
		);
	});

	it('never throws, whatever the backup holds', () => {
		fc.assert(
			fc.property(fc.jsonValue(), fc.jsonValue(), (profiles, exportedAt) => {
				const plan = planImport(backupOf({ profiles, exportedAt }), []);
				if (plan.ok) expect(Array.isArray(profiles)).toBe(true);
			})
		);
	});

	it('reads a file saved again by an editor that adds a byte order mark', () => {
		const plan = ready(planImport('\uFEFF' + exportBackup([LEA], EXPORTED_AT), []));
		expect(plan.importable).toEqual([LEA]);
	});

	it('brings the profiles of an older version to the current one', () => {
		const text = backupOf({ profiles: [asVersion1(LEA), asVersion4(NOE)] });
		expect(ready(planImport(text, [])).importable).toEqual([LEA, NOE]);
	});

	it('keeps the time of the recent plays, and reads a version 7 profile without it', () => {
		const timed = withProgress(LEA, {
			lessons: {},
			chars: {
				f: {
					attempts: 12,
					errors: 2,
					recent: [
						{ attempts: 8, errors: 2, latencyMs: 640.5 },
						{ attempts: 4, errors: 0, latencyMs: null }
					]
				}
			}
		});
		expect(ready(planImport(exportBackup([timed], EXPORTED_AT), [])).importable).toEqual([timed]);
		const old = backupOf({ profiles: [asVersion7(timed)] });
		expect(ready(planImport(old, [])).importable).toEqual([withUnknownLatency(timed)]);
	});

	it('sets apart the children already on the device, with the profile each one would replace', () => {
		const here = renameProfile(LEA, 'Léa B');
		const plan = ready(
			planImport(exportBackup([NOE, LEA], EXPORTED_AT), [here, child('p-3', 'Zoé')])
		);
		expect(plan.importable).toEqual([NOE]);
		expect(plan.conflicts).toEqual([{ incoming: LEA, existing: here }]);
		expect(plan.takenIds).toEqual(['p-1', 'p-3']);
	});

	it('accepts a backup of no child', () => {
		const plan = ready(planImport(exportBackup([], EXPORTED_AT), [LEA]));
		expect(plan.importable).toEqual([]);
		expect(plan.conflicts).toEqual([]);
	});
});

describe('applyImport', () => {
	const here = renameProfile(LEA, 'Léa B');
	const plan = ready(planImport(exportBackup([NOE, LEA], EXPORTED_AT), [here]));

	it('replaces the profile present when asked to, keeping its id', () => {
		expect(applyImport(plan, { 'p-1': 'replace' }, counter('new-'))).toEqual([
			{ profile: NOE, copyOf: null },
			{ profile: LEA, copyOf: null }
		]);
	});

	it('keeps both under a new id, and says which profile the copy stands beside', () => {
		expect(applyImport(plan, { 'p-1': 'keep-both' }, counter('new-'))).toEqual([
			{ profile: NOE, copyOf: null },
			{ profile: { ...LEA, id: 'new-1' }, copyOf: 'p-1' }
		]);
	});

	it('refuses a conflict left without a choice', () => {
		expect(() => applyImport(plan, {}, counter('new-'))).toThrow(/p-1/);
		expect(() => applyImport(plan, { 'p-2': 'replace' }, counter('new-'))).toThrow(/p-1/);
	});

	it('refuses a new id that is already used here or in the file', () => {
		for (const used of ['p-1', 'p-2', '']) {
			expect(() => applyImport(plan, { 'p-1': 'keep-both' }, () => used)).toThrow(RangeError);
		}
	});

	it('gives every profile kept beside another an id of its own', () => {
		fc.assert(
			fc.property(
				profilesArb,
				fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
				(profiles, keep) => {
					const existing = profiles.map((profile) => renameProfile(profile, 'Ici'));
					const choices = Object.fromEntries(
						profiles.map(
							(profile, index) => [profile.id, keep[index] ? 'keep-both' : 'replace'] as const
						)
					);
					const planned = ready(planImport(exportBackup(profiles, EXPORTED_AT), existing));
					const imported = applyImport(planned, choices, counter('é-copy-'));
					expect(imported.map((entry) => ({ ...entry.profile, id: '' }))).toEqual(
						profiles.map((profile) => ({ ...profile, id: '' }))
					);
					const ids = [...existing, ...imported.map((entry) => entry.profile)].map((p) => p.id);
					const copies = imported.filter((entry) => entry.copyOf !== null).length;
					expect(new Set(ids).size).toBe(existing.length + copies);
					for (const entry of imported) {
						const kept = entry.copyOf !== null;
						expect(kept).toBe(choices[entry.copyOf ?? entry.profile.id] === 'keep-both');
					}
				}
			)
		);
	});

	it('keeps the journal of a profile through export and import', () => {
		fc.assert(
			fc.property(fc.array(sessionRecordArb, { maxLength: 5 }), (sessions) => {
				let profile = LEA;
				for (const session of sessions)
					profile = withSessionRecorded(profile, session, JOURNAL_RULES);
				const planned = ready(planImport(exportBackup([profile], EXPORTED_AT), []));
				expect(planned.importable).toEqual([profile]);
			})
		);
	});
});
