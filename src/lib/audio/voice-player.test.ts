import { describe, expect, it, vi } from 'vitest';
import { voiceKey } from './voice-key';
import {
	createVoicePlayer,
	loadVoiceManifest,
	parseVoiceManifest,
	type VoiceAudioLike
} from './voice-player';
import type { VoiceManifest } from './voice-types';

const KNOWN = 'Pose tes deux index sur les touches F et J.';
const OTHER = 'Appuie avec un pouce sur la grande barre du bas.';
const UNKNOWN = 'Ce texte n’a pas été enregistré.';
const BASE_URL = '/voice/fr';

function manifest(): VoiceManifest {
	return {
		schemaVersion: 1,
		locale: 'fr',
		voice: { name: 'Camille', source: 'Enregistrement original', license: 'CC BY-SA 4.0' },
		clips: {
			[voiceKey(KNOWN)]: { file: `${voiceKey(KNOWN)}.mp3`, durationMs: 3200 },
			[voiceKey(OTHER)]: { file: `${voiceKey(OTHER)}.wav`, durationMs: 2800 }
		}
	};
}

interface FakeAudio extends VoiceAudioLike {
	readonly url: string;
	paused: boolean;
	emit(type: 'ended' | 'error'): void;
}

interface Harness {
	readonly audios: FakeAudio[];
	enabled: boolean;
	playFails: boolean;
	createFails: boolean;
	readonly createAudio: (url: string) => VoiceAudioLike;
}

function harness(): Harness {
	const self: Harness = {
		audios: [],
		enabled: true,
		playFails: false,
		createFails: false,
		createAudio(url) {
			if (self.createFails) throw new Error('no audio device');
			const listeners = new Map<string, Set<() => void>>();
			const audio: FakeAudio = {
				url,
				paused: true,
				play() {
					if (self.playFails) return Promise.reject(new Error('not allowed'));
					audio.paused = false;
					return Promise.resolve();
				},
				pause() {
					audio.paused = true;
				},
				addEventListener(type, listener) {
					if (!listeners.has(type)) listeners.set(type, new Set());
					listeners.get(type)?.add(listener);
				},
				removeEventListener(type, listener) {
					listeners.get(type)?.delete(listener);
				},
				emit(type) {
					for (const listener of [...(listeners.get(type) ?? [])]) listener();
				}
			};
			self.audios.push(audio);
			return audio;
		}
	};
	return self;
}

function player(setup: Harness, data: VoiceManifest | null = manifest(), baseUrl = BASE_URL) {
	return createVoicePlayer({
		manifest: data,
		baseUrl,
		isEnabled: () => setup.enabled,
		createAudio: setup.createAudio
	});
}

/** `pending` while the promise has not settled. */
async function settledValue<T>(promise: Promise<T>): Promise<T | 'pending'> {
	return Promise.race([promise, Promise.resolve('pending' as const)]);
}

describe('createVoicePlayer', () => {
	it('knows which texts have a clip', () => {
		const voice = player(harness());

		expect(voice.has(KNOWN)).toBe(true);
		expect(voice.has(`  ${KNOWN.normalize('NFD')} `)).toBe(true);
		expect(voice.has(UNKNOWN)).toBe(false);
	});

	it('has no clip at all without a manifest', async () => {
		const setup = harness();
		const voice = player(setup, null);

		expect(voice.has(KNOWN)).toBe(false);
		await expect(voice.speak(KNOWN)).resolves.toBe('unavailable');
		expect(setup.audios).toHaveLength(0);
	});

	it('plays the file of the clip, next to the manifest, and answers once it has ended', async () => {
		const setup = harness();
		const voice = player(setup);

		const speaking = voice.speak(KNOWN);

		expect(setup.audios).toHaveLength(1);
		expect(setup.audios[0]?.url).toBe(`/voice/fr/${voiceKey(KNOWN)}.mp3`);
		expect(setup.audios[0]?.paused).toBe(false);
		expect(await settledValue(speaking)).toBe('pending');

		setup.audios[0]?.emit('ended');

		await expect(speaking).resolves.toBe('played');
	});

	it('accepts a base URL that ends with a slash', () => {
		const setup = harness();

		void player(setup, manifest(), '/sub/voice/fr/').speak(KNOWN);

		expect(setup.audios[0]?.url).toBe(`/sub/voice/fr/${voiceKey(KNOWN)}.mp3`);
	});

	it('says nothing when the voice is turned off', async () => {
		const setup = harness();
		setup.enabled = false;
		const voice = player(setup);

		await expect(voice.speak(KNOWN)).resolves.toBe('disabled');
		expect(setup.audios).toHaveLength(0);
		expect(voice.has(KNOWN)).toBe(true);
	});

	it('reads the setting again each time it speaks', async () => {
		const setup = harness();
		const voice = player(setup);
		setup.enabled = false;
		await voice.speak(KNOWN);

		setup.enabled = true;
		void voice.speak(KNOWN);

		expect(setup.audios).toHaveLength(1);
	});

	it('answers unavailable for a text without a clip', async () => {
		const setup = harness();

		await expect(player(setup).speak(UNKNOWN)).resolves.toBe('unavailable');
		expect(setup.audios).toHaveLength(0);
	});

	it('answers unavailable when the browser refuses to play', async () => {
		const setup = harness();
		setup.playFails = true;

		await expect(player(setup).speak(KNOWN)).resolves.toBe('unavailable');
	});

	it('answers unavailable when the file cannot be loaded', async () => {
		const setup = harness();
		const speaking = player(setup).speak(KNOWN);

		setup.audios[0]?.emit('error');

		await expect(speaking).resolves.toBe('unavailable');
	});

	it('answers unavailable when no audio element can be made', async () => {
		const setup = harness();
		setup.createFails = true;

		await expect(player(setup).speak(KNOWN)).resolves.toBe('unavailable');
	});

	it('answers unavailable when reading the setting throws', async () => {
		const setup = harness();
		const voice = createVoicePlayer({
			manifest: manifest(),
			baseUrl: BASE_URL,
			isEnabled: () => {
				throw new Error('no profile');
			},
			createAudio: setup.createAudio
		});

		await expect(voice.speak(KNOWN)).resolves.toBe('unavailable');
	});

	it('stops what was being said when it speaks again', async () => {
		const setup = harness();
		const voice = player(setup);
		const first = voice.speak(KNOWN);

		const second = voice.speak(OTHER);

		await expect(first).resolves.toBe('played');
		expect(setup.audios[0]?.paused).toBe(true);
		expect(setup.audios[1]?.paused).toBe(false);
		expect(await settledValue(second)).toBe('pending');
	});

	it('stops what was being said even when the new text has no clip', async () => {
		const setup = harness();
		const voice = player(setup);
		const first = voice.speak(KNOWN);

		await voice.speak(UNKNOWN);

		await expect(first).resolves.toBe('played');
		expect(setup.audios[0]?.paused).toBe(true);
	});

	it('stops on demand and answers played', async () => {
		const setup = harness();
		const voice = player(setup);
		const speaking = voice.speak(KNOWN);

		voice.stop();

		await expect(speaking).resolves.toBe('played');
		expect(setup.audios[0]?.paused).toBe(true);
	});

	it('ignores what a stopped clip does afterwards', async () => {
		const setup = harness();
		const voice = player(setup);
		const first = voice.speak(KNOWN);
		voice.stop();
		const second = voice.speak(OTHER);

		setup.audios[0]?.emit('ended');
		setup.audios[0]?.emit('error');

		await expect(first).resolves.toBe('played');
		expect(await settledValue(second)).toBe('pending');
		expect(setup.audios[1]?.paused).toBe(false);
	});

	it('does nothing when asked to stop while silent', () => {
		const voice = player(harness());

		expect(() => voice.stop()).not.toThrow();
	});

	it('never chains a clip after another by itself', async () => {
		const setup = harness();
		const speaking = player(setup).speak(KNOWN);

		setup.audios[0]?.emit('ended');
		await speaking;

		expect(setup.audios).toHaveLength(1);
	});

	it('falls silent for good once disposed', async () => {
		const setup = harness();
		const voice = player(setup);
		const speaking = voice.speak(KNOWN);

		voice.dispose();

		await expect(speaking).resolves.toBe('played');
		expect(setup.audios[0]?.paused).toBe(true);
		await expect(voice.speak(KNOWN)).resolves.toBe('unavailable');
		expect(voice.has(KNOWN)).toBe(false);
		expect(setup.audios).toHaveLength(1);
	});
});

describe('parseVoiceManifest', () => {
	it('accepts a well-formed manifest and gives it back', () => {
		expect(parseVoiceManifest(manifest())).toEqual(manifest());
	});

	it('accepts a manifest without any clip', () => {
		expect(parseVoiceManifest({ ...manifest(), clips: {} }).clips).toEqual({});
	});

	it.each([
		['not an object', [], 'voiceManifest: expected an object'],
		['another version', { ...manifest(), schemaVersion: 2 }, 'voiceManifest.schemaVersion'],
		['an unknown property', { ...manifest(), extra: true }, 'voiceManifest.extra'],
		['a locale that is not one', { ...manifest(), locale: 'français' }, 'voiceManifest.locale'],
		['no voice', { ...manifest(), voice: undefined }, 'voiceManifest.voice'],
		[
			'a voice without a license',
			{ ...manifest(), voice: { name: 'Camille', source: 'Original', license: ' ' } },
			'voiceManifest.voice.license'
		],
		['clips that are a list', { ...manifest(), clips: [] }, 'voiceManifest.clips'],
		[
			'a key that is not a voice key',
			{ ...manifest(), clips: { intro: { file: 'intro.mp3', durationMs: 10 } } },
			'voiceManifest.clips.intro'
		],
		[
			'a duration that is not positive',
			{ ...manifest(), clips: { [voiceKey(KNOWN)]: { file: 'a.mp3', durationMs: 0 } } },
			'durationMs'
		],
		[
			'an unknown clip property',
			{ ...manifest(), clips: { [voiceKey(KNOWN)]: { file: 'a.mp3', durationMs: 5, text: 'x' } } },
			'.text'
		]
	])('refuses %s', (_, data, message) => {
		expect(() => parseVoiceManifest(data)).toThrow(message);
	});

	it.each(['../secret.mp3', 'sub/a.mp3', 'https://example.org/a.mp3', '//example.org/a.mp3', ''])(
		'refuses the file "%s", which is not a plain file name next to the manifest',
		(file) => {
			const data = { ...manifest(), clips: { [voiceKey(KNOWN)]: { file, durationMs: 5 } } };

			expect(() => parseVoiceManifest(data)).toThrow('.file');
		}
	);
});

describe('loadVoiceManifest', () => {
	function response(body: unknown, ok = true) {
		return { ok, json: () => Promise.resolve(body) };
	}

	it('fetches the manifest next to the clips and validates it', async () => {
		const fetcher = vi.fn(() => Promise.resolve(response(manifest())));

		await expect(loadVoiceManifest(fetcher, '/voice/fr/')).resolves.toEqual(manifest());
		expect(fetcher).toHaveBeenCalledWith('/voice/fr/manifest.json');
	});

	it('gives null when the file does not exist', async () => {
		const fetcher = () => Promise.resolve(response('Not found', false));

		await expect(loadVoiceManifest(fetcher, BASE_URL)).resolves.toBeNull();
	});

	it('gives null when the network fails', async () => {
		const fetcher = () => Promise.reject(new TypeError('offline'));

		await expect(loadVoiceManifest(fetcher, BASE_URL)).resolves.toBeNull();
	});

	it('gives null when the answer is not JSON, as a host that serves a page for a missing file', async () => {
		const fetcher = () =>
			Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('Unexpected <')) });

		await expect(loadVoiceManifest(fetcher, BASE_URL)).resolves.toBeNull();
	});

	it('rejects with an explicit error when the manifest is malformed', async () => {
		const fetcher = () => Promise.resolve(response({ ...manifest(), schemaVersion: 7 }));

		await expect(loadVoiceManifest(fetcher, BASE_URL)).rejects.toThrow(
			'voiceManifest.schemaVersion'
		);
	});
});
