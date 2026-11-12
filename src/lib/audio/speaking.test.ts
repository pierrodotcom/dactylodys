import { describe, expect, it, vi } from 'vitest';
import { withSpeakingSignal } from './speaking';
import type { VoicePlayer } from './voice-types';

type Result = Awaited<ReturnType<VoicePlayer['speak']>>;

function fakeVoice(known = true) {
	const pending: ((result: Result) => void)[] = [];
	const voice: VoicePlayer = {
		has: () => known,
		speak: () => new Promise<Result>((resolve) => pending.push(resolve)),
		prepare: vi.fn(),
		stop: vi.fn(),
		dispose: vi.fn()
	};
	return { voice, pending };
}

describe('withSpeakingSignal', () => {
	it('says when the voice starts and when it is done', async () => {
		const { voice, pending } = fakeVoice();
		const onchange = vi.fn();
		const speaking = withSpeakingSignal(voice, onchange);

		const said = speaking.speak('Bonjour');
		expect(onchange).toHaveBeenLastCalledWith(true);
		pending[0]?.('played');
		await expect(said).resolves.toBe('played');
		expect(onchange).toHaveBeenLastCalledWith(false);
	});

	it('counts speaking again before the end as one stretch of speech', async () => {
		const { voice, pending } = fakeVoice();
		const onchange = vi.fn();
		const speaking = withSpeakingSignal(voice, onchange);

		const first = speaking.speak('Un');
		const second = speaking.speak('Deux');
		pending[0]?.('played');
		await first;
		expect(onchange).toHaveBeenLastCalledWith(true);
		pending[1]?.('played');
		await second;
		expect(onchange).toHaveBeenLastCalledWith(false);
	});

	it('leaves the background sound alone for a text without a clip', async () => {
		const { voice, pending } = fakeVoice(false);
		const onchange = vi.fn();
		const said = withSpeakingSignal(voice, onchange).speak('Rien');
		expect(onchange).not.toHaveBeenCalledWith(true);
		pending[0]?.('unavailable');
		await said;
	});

	it('passes everything else to the voice', () => {
		const { voice } = fakeVoice();
		const speaking = withSpeakingSignal(voice, () => undefined);
		speaking.prepare('Un');
		speaking.stop();
		speaking.dispose();
		expect(speaking.has('Un')).toBe(true);
		expect(voice.prepare).toHaveBeenCalledWith('Un');
		expect(voice.stop).toHaveBeenCalledOnce();
		expect(voice.dispose).toHaveBeenCalledOnce();
	});
});
