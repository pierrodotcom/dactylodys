import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { voiceKey } from '../../src/lib/audio/voice-key';
import { spokenMessages } from '../../src/lib/audio/voice-messages';
import { inRecordingOrder, lookReminders, voiceTexts } from '../../src/lib/audio/voice-texts';
import { parseProgression } from '../../src/lib/engine/progression/definition';
import { parseStory } from '../../src/lib/engine/story';
import before from './voice-texts-before.json';

/*
 * A recording already published is never lost by accident: the typography of the content
 * (`content-typography.test.ts`) changes no key, `voiceKey` hearing a no-break space as a space.
 * The keys of `voice-texts-before.json` are the published recordings that had a text on
 * 2026-11-26. A said text rewritten on purpose loses its recording: its old key leaves this file
 * in the same change. Only published recordings are listed: a text not recorded yet may change
 * freely.
 */
function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const messages = readJson('messages/fr.json') as Record<string, string>;
const texts = inRecordingOrder(
	voiceTexts(
		parseProgression(readJson('content/fr/progression/azerty-decouverte.json')),
		parseStory(readJson('content/fr/story/azerty-decouverte.json')),
		lookReminders(messages),
		spokenMessages(messages)
	)
);
const listed = new Set(texts.map((text) => text.key));

describe('the voice already recorded', () => {
	it('keeps a text for every published recording that had one', () => {
		expect(before.published.length).toBeGreaterThanOrEqual(48);
		expect(before.published.filter((key) => !listed.has(key))).toEqual([]);
	});

	it('says the sentence of the world where a mistake is erased, among the texts to record', () => {
		const erasing = voiceKey(messages['play_intro_erasing'] ?? '');
		expect(texts.find((text) => text.key === erasing)?.origin).toBe('play.intro#message');
	});
});
