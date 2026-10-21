import { VOICE_KEY_PATTERN, voiceKey } from './voice-key';
import type { VoiceClip, VoiceManifest, VoicePlayer } from './voice-types';
import {
	expectLocale,
	expectPositive,
	expectRecord,
	expectText,
	fail,
	refuseUnknownKeys
} from './voice-validation';

type PlaybackEvent = 'ended' | 'error';
type SpeakResult = Awaited<ReturnType<VoicePlayer['speak']>>;

/** The part of `HTMLAudioElement` used by the voice player; the real one fits. */
export interface VoiceAudioLike {
	play(): Promise<void>;
	pause(): void;
	addEventListener(type: PlaybackEvent, listener: () => void): void;
	removeEventListener(type: PlaybackEvent, listener: () => void): void;
}

export interface VoicePlayerOptions {
	/** `null` when no voice was published for the language: the player then has nothing to say. */
	readonly manifest: VoiceManifest | null;
	/** Folder of the manifest; the files of the clips are next to it. */
	readonly baseUrl: string;
	/** Read each time the voice is about to speak, so the setting can change while playing. */
	readonly isEnabled: () => boolean;
	readonly createAudio?: (url: string) => VoiceAudioLike;
}

/** The part of `Response` that `loadVoiceManifest` reads; `fetch` fits. */
export interface VoiceResponseLike {
	readonly ok: boolean;
	json(): Promise<unknown>;
}

export type VoiceFetcher = (url: string) => Promise<VoiceResponseLike>;

export const VOICE_MANIFEST_FILE = 'manifest.json';

/** A plain file name: a clip can only be a file served next to its manifest, never another address. */
const FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*\.[A-Za-z0-9]+$/;
const MANIFEST_KEYS = ['schemaVersion', 'locale', 'voice', 'clips'];
const VOICE_KEYS = ['name', 'source', 'license'] as const;
const CLIP_KEYS = ['file', 'durationMs'];

function parseClip(value: unknown, path: string): VoiceClip {
	const record = expectRecord(value, path);
	refuseUnknownKeys(record, CLIP_KEYS, path);
	const file = record['file'];
	if (typeof file !== 'string' || !FILE_PATTERN.test(file)) {
		fail(`${path}.file`, 'expected a plain file name, without any folder or address');
	}
	return { file, durationMs: expectPositive(record['durationMs'], `${path}.durationMs`) };
}

export function parseVoiceManifest(data: unknown): VoiceManifest {
	const root = expectRecord(data, 'voiceManifest');
	refuseUnknownKeys(root, MANIFEST_KEYS, 'voiceManifest');
	if (root['schemaVersion'] !== 1) fail('voiceManifest.schemaVersion', 'expected 1');

	const locale = expectLocale(root['locale'], 'voiceManifest.locale');

	const voiceRecord = expectRecord(root['voice'], 'voiceManifest.voice');
	refuseUnknownKeys(voiceRecord, VOICE_KEYS, 'voiceManifest.voice');
	const [name, source, license] = VOICE_KEYS.map((key) =>
		expectText(voiceRecord[key], `voiceManifest.voice.${key}`)
	) as [string, string, string];

	const clipRecords = expectRecord(root['clips'], 'voiceManifest.clips');
	const clips: Record<string, VoiceClip> = {};
	for (const [key, value] of Object.entries(clipRecords)) {
		const path = `voiceManifest.clips.${key}`;
		if (!VOICE_KEY_PATTERN.test(key)) fail(path, 'expected a voice key');
		clips[key] = parseClip(value, path);
	}

	return { schemaVersion: 1, locale, voice: { name, source, license }, clips };
}

function fileUrl(baseUrl: string, file: string): string {
	return `${baseUrl.replace(/\/+$/, '')}/${file}`;
}

/**
 * `null` when no manifest is served there, whatever the way the host says so (an error status, a
 * page instead of JSON, no network): the app must work without any voice. A manifest that is
 * served but malformed is a mistake in the published files, and rejects.
 */
export async function loadVoiceManifest(
	fetcher: VoiceFetcher,
	baseUrl: string
): Promise<VoiceManifest | null> {
	let data: unknown;
	try {
		const response = await fetcher(fileUrl(baseUrl, VOICE_MANIFEST_FILE));
		if (!response.ok) return null;
		data = await response.json();
	} catch {
		return null;
	}
	return parseVoiceManifest(data);
}

function createBrowserAudio(url: string): VoiceAudioLike {
	return new Audio(url);
}

interface Playback {
	finish(result: SpeakResult): void;
}

export function createVoicePlayer(options: VoicePlayerOptions): VoicePlayer {
	const createAudio = options.createAudio ?? createBrowserAudio;
	let current: Playback | undefined;
	let disposed = false;
	/** Clips loaded ahead by `prepare`, each played once: the browser keeps the file afterwards. */
	const prepared = new Map<string, VoiceAudioLike>();

	function audioFor(clip: VoiceClip): VoiceAudioLike {
		const ready = prepared.get(clip.file);
		prepared.delete(clip.file);
		return ready ?? createAudio(fileUrl(options.baseUrl, clip.file));
	}

	function clipFor(text: string): VoiceClip | undefined {
		const clips = disposed ? undefined : options.manifest?.clips;
		if (!clips) return undefined;
		const key = voiceKey(text);
		return Object.hasOwn(clips, key) ? clips[key] : undefined;
	}

	function play(clip: VoiceClip): Promise<SpeakResult> {
		return new Promise((resolve) => {
			let audio: VoiceAudioLike | undefined;
			let settled = false;
			const onEnded = () => playback.finish('played');
			const onError = () => playback.finish('unavailable');
			const playback: Playback = {
				finish(result) {
					if (settled) return;
					settled = true;
					if (current === playback) current = undefined;
					try {
						audio?.removeEventListener('ended', onEnded);
						audio?.removeEventListener('error', onError);
						audio?.pause();
					} catch {
						// An element that cannot even be paused is already silent.
					}
					resolve(result);
				}
			};
			current = playback;
			try {
				audio = audioFor(clip);
				audio.addEventListener('ended', onEnded);
				audio.addEventListener('error', onError);
				Promise.resolve(audio.play()).catch(onError);
			} catch {
				playback.finish('unavailable');
			}
		});
	}

	function stop() {
		current?.finish('played');
	}

	return {
		has: (text) => clipFor(text) !== undefined,
		speak(text) {
			stop();
			try {
				if (disposed) return Promise.resolve('unavailable');
				if (!options.isEnabled()) return Promise.resolve('disabled');
				const clip = clipFor(text);
				return clip ? play(clip) : Promise.resolve('unavailable');
			} catch {
				return Promise.resolve('unavailable');
			}
		},
		prepare(text) {
			try {
				if (disposed || !options.isEnabled()) return;
				const clip = clipFor(text);
				if (clip && !prepared.has(clip.file)) {
					prepared.set(clip.file, createAudio(fileUrl(options.baseUrl, clip.file)));
				}
			} catch {
				// Preparing is only a head start: speaking still works without it.
			}
		},
		stop,
		dispose() {
			stop();
			prepared.clear();
			disposed = true;
		}
	};
}
