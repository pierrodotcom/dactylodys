import { describe, expect, it } from 'vitest';
import { createDemoVoicePlayer } from './demo-voice';

async function settledValue<T>(promise: Promise<T>): Promise<T | 'pending'> {
	return Promise.race([promise, Promise.resolve('pending' as const)]);
}

describe('createDemoVoicePlayer', () => {
	it('has a clip for the texts it was given, and for no other', () => {
		const voice = createDemoVoicePlayer(['Un texte.']);

		expect(voice.has('Un texte.')).toBe(true);
		expect(voice.has('  Un texte. ')).toBe(true);
		expect(voice.has('Un autre texte.')).toBe(false);
	});

	it('says a text until it is stopped', async () => {
		const voice = createDemoVoicePlayer(['Un texte.']);
		const speaking = voice.speak('Un texte.');

		expect(await settledValue(speaking)).toBe('pending');
		voice.stop();

		await expect(speaking).resolves.toBe('played');
	});

	it('stops what it was saying when it speaks again', async () => {
		const voice = createDemoVoicePlayer(['Un texte.', 'Un autre texte.']);
		const first = voice.speak('Un texte.');

		const second = voice.speak('Un autre texte.');

		await expect(first).resolves.toBe('played');
		expect(await settledValue(second)).toBe('pending');
	});

	it('answers unavailable for a text it does not have', async () => {
		await expect(createDemoVoicePlayer([]).speak('Un texte.')).resolves.toBe('unavailable');
	});
});
