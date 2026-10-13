import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseVoiceConfig } from './voice-config';

const shipped: Record<string, unknown> = JSON.parse(
	readFileSync('content/common/voice.json', 'utf8')
);

describe('parseVoiceConfig', () => {
	it('accepts the shipped configuration', () => {
		const config = parseVoiceConfig(shipped);

		expect(config.sampleRate).toBe(22050);
		expect(config).not.toHaveProperty('schemaVersion');
	});

	it.each([
		['not an object', null, 'voiceConfig: expected an object'],
		['another version', { ...shipped, schemaVersion: 2 }, 'voiceConfig.schemaVersion'],
		['an unknown property', { ...shipped, gain: 2 }, 'voiceConfig.gain'],
		['a fractional sample rate', { ...shipped, sampleRate: 22050.5 }, 'voiceConfig.sampleRate'],
		['a take without an end', { ...shipped, maxTakeSeconds: 0 }, 'voiceConfig.maxTakeSeconds'],
		['a slice of no length', { ...shipped, silenceFrameMs: 0 }, 'voiceConfig.silenceFrameMs'],
		['a silence ratio above 1', { ...shipped, silenceRatio: 1.5 }, 'voiceConfig.silenceRatio'],
		['a negative padding', { ...shipped, silencePaddingMs: -1 }, 'voiceConfig.silencePaddingMs'],
		['a target peak above 1', { ...shipped, targetPeak: 1.1 }, 'voiceConfig.targetPeak'],
		['a floor above the target', { ...shipped, minPeak: 0.95 }, 'voiceConfig.minPeak'],
		['a negative fade', { ...shipped, fadeMs: -5 }, 'voiceConfig.fadeMs'],
		['a missing bit rate', { ...shipped, mp3BitrateKbps: undefined }, 'voiceConfig.mp3BitrateKbps']
	])('refuses %s', (_, data, message) => {
		expect(() => parseVoiceConfig(data)).toThrow(message);
	});
});
