import { describe, expect, it } from 'vitest';
import { voiceKey } from '$lib/audio/voice-key';
import type { VoiceText } from '$lib/audio/voice-texts';
import type { VoiceManifest } from '$lib/audio/voice-types';
import {
	firstMissingIndex,
	positionOf,
	publishedKeys,
	recordingProgress,
	textState,
	textsToGoThrough
} from './recording-list';

function text(value: string, origin: string): VoiceText {
	return { key: voiceKey(value), text: value, origin };
}

/** In the order to record them; B and D have a published voice. */
const [A, B, C, D, E] = [
	text('Le carnet est plein.', 'fr.world.a#opening'),
	text('Page une : les dinosaures.', 'fr.world.a#ending'),
	text('F, à gauche, a un petit trait.', 'fr.lesson.a#step'),
	text('J, à droite, a le même trait.', 'fr.lesson.a#step'),
	text('Super travail.', 'play.result#message')
] as const;
const TEXTS: readonly VoiceText[] = [A, B, C, D, E];

function manifest(...published: VoiceText[]): VoiceManifest {
	return {
		schemaVersion: 1,
		locale: 'fr',
		voice: { name: 'contribution anonyme', source: 'essai', license: 'CC BY-SA 4.0' },
		clips: Object.fromEntries(
			published.map((item) => [item.key, { file: `${item.key}.mp3`, durationMs: 1000 }])
		)
	};
}

const PUBLISHED = publishedKeys(manifest(B, D));
/** A key the manifest keeps for a text that no longer exists. */
const STALE = publishedKeys(manifest(B, D, text('Un ancien texte.', 'fr.lesson.z#intro')));

function taken(...list: VoiceText[]): ReadonlySet<string> {
	return new Set(list.map((item) => item.key));
}

describe('publishedKeys', () => {
	it('reads the keys of the published clips', () => {
		expect(PUBLISHED).toEqual(new Set([B.key, D.key]));
	});

	it('knows nothing when there is no manifest', () => {
		expect(publishedKeys(null)).toBeNull();
	});
});

describe('textState', () => {
	it('says a text with a published voice is online', () => {
		expect(textState(B, taken(), PUBLISHED)).toBe('online');
	});

	it('says a text without any voice is still to record', () => {
		expect(textState(A, taken(), PUBLISHED)).toBe('missing');
	});

	it('says a text with a take in this browser is recorded, whether it is online or not', () => {
		expect(textState(A, taken(A, B), PUBLISHED)).toBe('recorded');
		expect(textState(B, taken(A, B), PUBLISHED)).toBe('recorded');
	});

	it('says no text is online when the manifest could not be read', () => {
		expect(TEXTS.map((item) => textState(item, taken(C), null))).toEqual([
			'missing',
			'missing',
			'recorded',
			'missing',
			'missing'
		]);
	});
});

describe('textsToGoThrough', () => {
	it('leaves out the texts already online, in the order to record them', () => {
		expect(textsToGoThrough(TEXTS, PUBLISHED, false)).toEqual([A, C, E]);
	});

	it('keeps a text online that has a take in this browser out of the list as well', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, false);
		expect(recordingProgress(list, taken(B), PUBLISHED)).toEqual({
			recorded: 0,
			total: 3,
			remaining: 3
		});
	});

	it('gives the whole list when the texts already online are asked for', () => {
		expect(textsToGoThrough(TEXTS, PUBLISHED, true)).toEqual(TEXTS);
	});

	it('shows everything when the manifest could not be read', () => {
		expect(textsToGoThrough(TEXTS, null, false)).toEqual(TEXTS);
	});

	it('is empty once every text is online', () => {
		expect(textsToGoThrough(TEXTS, publishedKeys(manifest(...TEXTS)), false)).toEqual([]);
	});

	it('ignores a published voice whose text no longer exists', () => {
		expect(textsToGoThrough(TEXTS, STALE, false)).toEqual([A, C, E]);
	});
});

describe('firstMissingIndex', () => {
	it('goes to the first text without a take among those not online', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, false);
		expect(firstMissingIndex(list, taken(A), PUBLISHED)).toBe(1);
	});

	it('skips the texts already online when the whole list is shown', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, true);
		expect(firstMissingIndex(list, taken(A), PUBLISHED)).toBe(TEXTS.indexOf(C));
		expect(firstMissingIndex(list, taken(A, C), PUBLISHED)).toBe(TEXTS.indexOf(E));
	});

	it('goes to the first text without a take when the manifest could not be read', () => {
		const list = textsToGoThrough(TEXTS, null, false);
		expect(firstMissingIndex(list, taken(A), null)).toBe(TEXTS.indexOf(B));
	});

	it('finds none once every text has a voice', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, true);
		expect(firstMissingIndex(list, taken(A, C, E), PUBLISHED)).toBe(-1);
	});
});

describe('recordingProgress', () => {
	it('counts only the texts without a published voice by default', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, false);
		expect(recordingProgress(list, taken(C), PUBLISHED)).toEqual({
			recorded: 1,
			total: 3,
			remaining: 2
		});
	});

	it('leaves as many texts to record when the texts already online are shown', () => {
		const list = textsToGoThrough(TEXTS, PUBLISHED, true);
		expect(recordingProgress(list, taken(B, C), PUBLISHED)).toEqual({
			recorded: 2,
			total: 5,
			remaining: 2
		});
	});

	it('counts every text when the manifest could not be read', () => {
		const list = textsToGoThrough(TEXTS, null, false);
		expect(recordingProgress(list, taken(B, C), null)).toEqual({
			recorded: 2,
			total: 5,
			remaining: 3
		});
	});
});

describe('positionOf', () => {
	const shortList = textsToGoThrough(TEXTS, PUBLISHED, false);

	it('stays on the same text when the list grows', () => {
		expect(positionOf(TEXTS, TEXTS, C.key)).toBe(2);
	});

	it('goes to the next text of the list when the text shown leaves it', () => {
		expect(positionOf(shortList, TEXTS, B.key)).toBe(shortList.indexOf(C));
		expect(positionOf(shortList, TEXTS, D.key)).toBe(shortList.indexOf(E));
	});

	it('goes to the last text when no text of the list comes after', () => {
		expect(positionOf([A, C], TEXTS, D.key)).toBe(1);
	});

	it('starts at the beginning without a text shown or with an empty list', () => {
		expect(positionOf(shortList, TEXTS, undefined)).toBe(0);
		expect(positionOf([], TEXTS, C.key)).toBe(0);
	});
});
