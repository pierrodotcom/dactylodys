import {
	VOICE_RECORDINGS_FILE,
	parseVoiceRecordings,
	voiceArchiveName,
	voiceClipFile,
	type VoiceRecordings
} from '$lib/audio/voice-recordings';
import type { VoiceText } from '$lib/audio/voice-texts';
import type { Take } from './take-store';
import { writeZip } from './zip-writer';

export interface ArchiveInput {
	/** The texts to say today: a take whose text was rewritten since is left out. */
	readonly texts: readonly VoiceText[];
	readonly takes: ReadonlyMap<string, Take>;
	readonly locale: string;
	/** Name to credit, as typed; empty for an anonymous contribution. */
	readonly credit: string;
	readonly exportedAt: Date;
	readonly sampleRate: number;
}

export interface VoiceArchive {
	readonly fileName: string;
	readonly bytes: Uint8Array<ArrayBuffer>;
	readonly recordings: VoiceRecordings;
}

/** A name on a single line, without spaces around: what the credits can show as it is. */
export function tidyCredit(credit: string): string {
	return credit.replace(/\s+/gu, ' ').trim();
}

/** The texts that have a take, in the order of the course. */
export function recordedTexts(
	texts: readonly VoiceText[],
	takes: ReadonlyMap<string, Take>
): readonly VoiceText[] {
	return texts.filter((text) => takes.has(text.key));
}

/** One file to download: a WAV per recorded text and the index that describes them. */
export function buildVoiceArchive(input: ArchiveInput): VoiceArchive {
	const recorded = recordedTexts(input.texts, input.takes);
	const recordedAt = input.exportedAt.toISOString();
	// Validated like the import tool will: an archive it would refuse is never offered.
	const recordings = parseVoiceRecordings({
		schemaVersion: 1,
		locale: input.locale,
		credit: tidyCredit(input.credit),
		recordedAt,
		sampleRate: input.sampleRate,
		clips: recorded.map((text) => ({
			key: text.key,
			text: text.text,
			origin: text.origin,
			file: voiceClipFile(text.key),
			durationMs: input.takes.get(text.key)?.durationMs
		}))
	});
	const index = new TextEncoder().encode(`${JSON.stringify(recordings, null, '\t')}\n`);
	const bytes = writeZip(
		[
			...recorded.map((text) => ({
				name: voiceClipFile(text.key),
				data: input.takes.get(text.key)?.wav ?? new Uint8Array(0)
			})),
			{ name: VOICE_RECORDINGS_FILE, data: index }
		],
		input.exportedAt
	);
	return { fileName: voiceArchiveName(input.locale, recordedAt), bytes, recordings };
}
