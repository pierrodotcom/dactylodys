import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VOICE_KEY_PATTERN, voiceKey } from './voice-key';

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

interface ShippedProgression {
	worlds: { title: string; lessons: { title: string; intro: string }[] }[];
}

/** Every sentence the app ships today: far more than the voice will ever have to say. */
function shippedTexts(): string[] {
	const progression = readJson<ShippedProgression>('content/fr/progression/azerty-decouverte.json');
	const phrases = readJson<{ phrases: { text: string }[] }>('content/fr/phrases/base.json');
	const messages = readJson<Record<string, string>>('messages/fr.json');
	return [
		...progression.worlds.flatMap((world) => [
			world.title,
			...world.lessons.flatMap((lesson) => [lesson.title, lesson.intro])
		]),
		...phrases.phrases.map((phrase) => phrase.text),
		...Object.values(messages)
	];
}

describe('voiceKey', () => {
	it('gives the reference values of FNV-1a 64 for plain texts', () => {
		expect(voiceKey('a')).toBe('af63dc4c8601ec8c');
		expect(voiceKey('foobar')).toBe('85944171f73967e8');
	});

	it('keeps giving the same key to a sentence with accents', () => {
		expect(voiceKey('Sur la rangée des chiffres, ton index droit tape È.')).toBe(
			'0e2e0f1ee3f37b45'
		);
	});

	it('is a lowercase hexadecimal string of fixed length', () => {
		for (const text of ['', 'a', 'Pose tes deux index sur les touches F et J.', '🦕 été']) {
			expect(voiceKey(text)).toMatch(VOICE_KEY_PATTERN);
			expect(voiceKey(text)).toHaveLength(16);
		}
	});

	it('gives the same key to the composed and decomposed forms of a text', () => {
		const text = 'Tape É, à côté de ça : où ? Noël !';

		expect(text.normalize('NFD')).not.toBe(text.normalize('NFC'));
		expect(voiceKey(text.normalize('NFD'))).toBe(voiceKey(text.normalize('NFC')));
	});

	it('ignores the spaces around a text, not those inside', () => {
		expect(voiceKey('  Tape la lettre.\n')).toBe(voiceKey('Tape la lettre.'));
		expect(voiceKey('Tape  la lettre.')).not.toBe(voiceKey('Tape la lettre.'));
	});

	it('tells apart texts that differ by one character', () => {
		expect(voiceKey('Tape la lettre F.')).not.toBe(voiceKey('Tape la lettre J.'));
		expect(voiceKey('tape')).not.toBe(voiceKey('Tape'));
	});

	it('gives a different key to every text the app ships', () => {
		const texts = [...new Set(shippedTexts().map((text) => text.normalize('NFC').trim()))];
		const keys = new Set(texts.map(voiceKey));

		expect(texts.length).toBeGreaterThan(300);
		expect(keys.size).toBe(texts.length);
	});
});
