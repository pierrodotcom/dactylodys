import type { VoiceRecordings } from '../../../src/lib/audio/voice-recordings';
import type { VoiceText } from '../../../src/lib/audio/voice-texts';
import type { VoiceClip, VoiceManifest } from '../../../src/lib/audio/voice-types';

/*
 * What importing an archive of recordings changes in `static/voice/<locale>/`, decided without
 * touching any file: `import.js` only carries the plan out. Checked by
 * `src/lib/audio/voice-import.test.ts`.
 */

export type ClipFormat = 'wav' | 'mp3';

export interface ImportInput {
	readonly recordings: VoiceRecordings;
	/** Length of each clip of the archive, read from its WAV file rather than trusted from the index. */
	readonly durations: ReadonlyMap<string, number>;
	/** The manifest already published for this language, `null` when there is none. */
	readonly existing: VoiceManifest | null;
	/** Every text the voice has to say today. */
	readonly texts: readonly VoiceText[];
	/** Format the clips are published in. */
	readonly format: ClipFormat;
	/** Whether clips whose text no longer exists are removed. */
	readonly prune: boolean;
}

export interface ClipWrite {
	readonly key: string;
	/** Name of the WAV entry in the archive. */
	readonly source: string;
	/** Name of the published file. */
	readonly file: string;
}

export interface OrphanClip {
	readonly key: string;
	readonly file: string;
	/** The text that was recorded, when the archive tells it. */
	readonly text: string | null;
}

export interface ImportPlan {
	readonly manifest: VoiceManifest;
	readonly writes: readonly ClipWrite[];
	/** Published files that are replaced by another format, or pruned. */
	readonly deletes: readonly string[];
	/** Texts that still have no clip once the archive is imported. */
	readonly missing: readonly VoiceText[];
	/** Clips whose text is no longer to be said: removed when pruning, reported otherwise. */
	readonly orphans: readonly OrphanClip[];
	readonly pruned: boolean;
}

export interface ReportInput {
	readonly plan: ImportPlan;
	/** Folder of the published voice, as shown to the person. */
	readonly directory: string;
	readonly format: ClipFormat;
	readonly mp3BitrateKbps: number;
	/** Size of every published clip, once the plan is carried out. */
	readonly totalBytes: number;
}

export const ANONYMOUS_CREDIT = 'contribution anonyme';
export const VOICE_SOURCE = 'Enregistrement original réalisé pour le projet, aucune source tierce';
export const VOICE_LICENSE = 'CC BY-SA 4.0';

const CREDIT_SEPARATOR = ', ';
const BYTES_PER_UNIT = 1024;
const REPORT_LOCALE = 'fr-FR';

/** Every person who lent a voice stays credited: the license asks for it. */
export function mergeCredits(existing: string | undefined, credit: string): string {
	const name = credit.trim() === '' ? ANONYMOUS_CREDIT : credit.trim();
	const names = existing === undefined ? [] : existing.split(CREDIT_SEPARATOR);
	return names.includes(name)
		? names.join(CREDIT_SEPARATOR)
		: [...names, name].join(CREDIT_SEPARATOR);
}

export function planImport(input: ImportInput): ImportPlan {
	const { recordings, existing } = input;
	if (existing !== null && existing.locale !== recordings.locale) {
		throw new Error(
			`The published voice is in "${existing.locale}", the archive in "${recordings.locale}"`
		);
	}
	const expected = new Set(input.texts.map((text) => text.key));
	const published = existing?.clips ?? {};
	const clips = new Map<string, VoiceClip>(Object.entries(published));
	const writes: ClipWrite[] = [];
	const deletes: string[] = [];
	const orphans: OrphanClip[] = [];

	for (const [key, clip] of Object.entries(published)) {
		if (expected.has(key)) continue;
		orphans.push({ key, file: clip.file, text: null });
		if (input.prune) {
			clips.delete(key);
			deletes.push(clip.file);
		}
	}

	for (const clip of recordings.clips) {
		const file = `${clip.key}.${input.format}`;
		const durationMs = input.durations.get(clip.key);
		if (durationMs === undefined) throw new Error(`No duration for the clip "${clip.key}"`);
		if (!expected.has(clip.key)) {
			const known = orphans.findIndex((orphan) => orphan.key === clip.key);
			if (known >= 0) orphans.splice(known, 1);
			orphans.push({ key: clip.key, file, text: clip.text });
			if (input.prune) continue;
		}
		const previous = published[clip.key]?.file;
		if (previous !== undefined && previous !== file && !deletes.includes(previous)) {
			deletes.push(previous);
		}
		clips.set(clip.key, { file, durationMs });
		writes.push({ key: clip.key, source: clip.file, file });
	}

	const sortedKeys = [...clips.keys()].sort();
	return {
		manifest: {
			schemaVersion: 1,
			locale: recordings.locale,
			voice: {
				name: mergeCredits(existing?.voice.name, recordings.credit),
				source: VOICE_SOURCE,
				license: VOICE_LICENSE
			},
			clips: Object.fromEntries(sortedKeys.map((key) => [key, clips.get(key)!]))
		},
		writes,
		deletes: deletes.sort(),
		missing: input.texts.filter((text) => !clips.has(text.key)),
		orphans: orphans.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)),
		pruned: input.prune
	};
}

/** Stable from one import to the next, and already formatted the way Prettier wants it. */
export function serializeManifest(manifest: VoiceManifest): string {
	return `${JSON.stringify(manifest, null, '\t')}\n`;
}

export function formatBytes(bytes: number): string {
	const format = (value: number, unit: string) =>
		`${new Intl.NumberFormat(REPORT_LOCALE, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
	if (bytes < BYTES_PER_UNIT) return format(bytes, 'octets');
	if (bytes < BYTES_PER_UNIT ** 2) return format(bytes / BYTES_PER_UNIT, 'Ko');
	return format(bytes / BYTES_PER_UNIT ** 2, 'Mo');
}

function plural(count: number, one: string, other: string): string {
	return `${count} ${count < 2 ? one : other}`;
}

/** What the person reads once the import is done, in French like the rest of the tool. */
export function renderReport(input: ReportInput): string {
	const { plan } = input;
	const clipCount = Object.keys(plan.manifest.clips).length;
	const lines = [
		`Voix « ${plan.manifest.locale} » : ${plural(plan.writes.length, 'enregistrement importé', 'enregistrements importés')} dans ${input.directory}.`,
		input.format === 'mp3'
			? `Format : MP3 mono à ${input.mp3BitrateKbps} kbit/s (converti par ffmpeg).`
			: 'Format : WAV. ffmpeg est absent du PATH ou a été écarté : les fichiers ne sont pas compressés.',
		`Crédit : ${plan.manifest.voice.name}.`,
		'',
		`Textes sans enregistrement : ${plan.missing.length}`,
		...plan.missing.map((text) => `  - ${text.origin} : « ${text.text} »`),
		'',
		`Enregistrements dont le texte n'existe plus : ${plan.orphans.length}${
			plan.orphans.length === 0
				? ''
				: plan.pruned
					? ' (supprimés)'
					: ' (relance avec --prune pour les supprimer)'
		}`,
		...plan.orphans.map(
			(orphan) => `  - ${orphan.file}${orphan.text === null ? '' : ` : « ${orphan.text} »`}`
		),
		'',
		`Poids total : ${formatBytes(input.totalBytes)} pour ${plural(clipCount, 'fichier', 'fichiers')}.`
	];
	return `${lines.join('\n')}\n`;
}
