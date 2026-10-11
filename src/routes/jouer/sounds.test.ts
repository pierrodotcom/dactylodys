import { describe, expect, it, vi } from 'vitest';
import type { AudioContextLike } from '$lib/audio';
import { createProfileSounds } from './sounds';

function fakeContext(): AudioContextLike & { created: number } {
	const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
	const context = {
		created: 0,
		currentTime: 0,
		state: 'running',
		destination: {},
		createOscillator: () => {
			context.created++;
			return {
				type: '',
				frequency: param,
				connect: vi.fn(),
				start: vi.fn(),
				stop: vi.fn()
			};
		},
		createGain: () => ({ gain: param, connect: vi.fn() }),
		resume: () => Promise.resolve(),
		close: () => Promise.resolve()
	};
	return context;
}

describe('createProfileSounds', () => {
	it('stays silent while there is no profile', () => {
		const context = fakeContext();
		const sounds = createProfileSounds(() => null, { createContext: () => context });

		sounds.play('correct');

		expect(context.created).toBe(0);
	});

	it('plays when the profile asks for sound', () => {
		const context = fakeContext();
		const sounds = createProfileSounds(() => ({ soundEnabled: true }), {
			createContext: () => context
		});

		sounds.play('correct');

		expect(context.created).toBeGreaterThan(0);
	});

	it('follows the sound setting of the profile as it changes', () => {
		const context = fakeContext();
		const settings = { soundEnabled: false };
		const sounds = createProfileSounds(() => settings, { createContext: () => context });

		sounds.play('correct');
		expect(context.created).toBe(0);

		settings.soundEnabled = true;
		sounds.play('correct');
		expect(context.created).toBeGreaterThan(0);
	});
});
