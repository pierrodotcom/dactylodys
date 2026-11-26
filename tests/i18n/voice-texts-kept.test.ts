import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { voiceKey } from '../../src/lib/audio/voice-key';
import { spokenMessages } from '../../src/lib/audio/voice-messages';
import { inRecordingOrder, lookReminders, voiceTexts } from '../../src/lib/audio/voice-texts';
import { parseProgression } from '../../src/lib/engine/progression/definition';
import { parseStory } from '../../src/lib/engine/story';
import before from './voice-texts-before.json';

/*
 * The typography of the content (`content-typography.test.ts`) and the sentence of the world where
 * a mistake is erased, now said, lose no voice: `voiceKey` hears a no-break space as a space. The
 * keys of `voice-texts-before.json` are those of the list of `/dev/voix` before them, and of the
 * published recordings that had a text then. A said text rewritten on purpose loses its recording:
 * its old key leaves this file in the same change.
 */
function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const messages = readJson('messages/fr.json') as Record<string, string>;
const manifest = readJson('static/voice/fr/manifest.json') as { clips: Record<string, unknown> };
const texts = inRecordingOrder(
	voiceTexts(
		parseProgression(readJson('content/fr/progression/azerty-decouverte.json')),
		parseStory(readJson('content/fr/story/azerty-decouverte.json')),
		lookReminders(messages),
		spokenMessages(messages)
	)
);
const listed = new Set(texts.map((text) => text.key));
const ERASING = voiceKey(messages['play_intro_erasing'] ?? '');

describe('the voice after the typography of the content', () => {
	it('keeps a text for every published recording that had one', () => {
		expect(before.published.length).toBeGreaterThanOrEqual(48);
		expect(before.published.filter((key) => !(key in manifest.clips))).toEqual([]);
		expect(before.published.filter((key) => !listed.has(key))).toEqual([]);
	});

	it('keeps every text of the list of /dev/voix, in its order', () => {
		const kept = texts.map((text) => text.key).filter((key) => before.listed.includes(key));
		expect(kept).toEqual(before.listed);
	});

	it('adds the sentence of the world where a mistake is erased to the texts to record', () => {
		expect(before.listed).not.toContain(ERASING);
		expect(texts.find((text) => text.key === ERASING)?.origin).toBe('play.intro#message');
	});
});
