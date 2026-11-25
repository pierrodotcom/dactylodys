import type { VoiceText } from '$lib/audio/voice-texts';
import type { VoiceManifest } from '$lib/audio/voice-types';

/**
 * `online`: its voice is published with the site (its key is in the manifest); `recorded`: a take
 * of it is in this browser, published or not; `missing`: neither, it is still to record.
 */
export type TextState = 'online' | 'recorded' | 'missing';

/** The keys of the published voice; `null` when the page could not read its manifest. */
export type PublishedKeys = ReadonlySet<string> | null;

/** The keys that have a take in this browser. */
export type TakenKeys = Pick<ReadonlyMap<string, unknown>, 'has'>;

export function publishedKeys(manifest: VoiceManifest | null): PublishedKeys {
	return manifest ? new Set(Object.keys(manifest.clips)) : null;
}

export function isPublished(text: VoiceText, published: PublishedKeys): boolean {
	return published?.has(text.key) ?? false;
}

export function textState(text: VoiceText, takes: TakenKeys, published: PublishedKeys): TextState {
	if (takes.has(text.key)) return 'recorded';
	return isPublished(text, published) ? 'online' : 'missing';
}

/**
 * The texts the page goes through, in the order to record them: those without a published voice,
 * unless the published ones are asked for too, or unless the page does not know which they are.
 */
export function textsToGoThrough(
	texts: readonly VoiceText[],
	published: PublishedKeys,
	showPublished: boolean
): readonly VoiceText[] {
	if (published === null || showPublished) return texts;
	return texts.filter((text) => !isPublished(text, published));
}

/** The first text of `list` that has no voice at all, published or taken; -1 when none is left. */
export function firstMissingIndex(
	list: readonly VoiceText[],
	takes: TakenKeys,
	published: PublishedKeys
): number {
	return list.findIndex((text) => textState(text, takes, published) === 'missing');
}

/**
 * Where to stand in `list` once it has changed: on the same text when it is there, else on the
 * next one of `texts` that is, else on the last one; 0 for an empty list.
 */
export function positionOf(
	list: readonly VoiceText[],
	texts: readonly VoiceText[],
	key: string | undefined
): number {
	const start = texts.findIndex((text) => text.key === key);
	if (start < 0) return 0;
	const listed = new Set(list.map((text) => text.key));
	const next = texts.slice(start).find((text) => listed.has(text.key));
	return next ? list.indexOf(next) : Math.max(0, list.length - 1);
}

export interface RecordingProgress {
	/** Texts of the list that have a take in this browser. */
	readonly recorded: number;
	readonly total: number;
	/** Texts of the list without any voice: the same whether the published ones are shown or not. */
	readonly remaining: number;
}

export function recordingProgress(
	list: readonly VoiceText[],
	takes: TakenKeys,
	published: PublishedKeys
): RecordingProgress {
	const states = list.map((text) => textState(text, takes, published));
	return {
		recorded: states.filter((state) => state === 'recorded').length,
		total: list.length,
		remaining: states.filter((state) => state === 'missing').length
	};
}
