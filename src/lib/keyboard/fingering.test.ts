import { describe, expect, it } from 'vitest';
import { fingerForKey, isReducedFingering, parseFingeringProfile } from './fingering';

function makeProfile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		schemaVersion: 1,
		id: 'test-profile',
		geometry: 'iso',
		fingers: { KeyA: 'left-pinky', KeyF: 'left-index', Space: 'right-thumb' },
		homeKeys: { 'left-pinky': 'KeyA', 'right-thumb': 'Space' },
		...overrides
	};
}

describe('parseFingeringProfile', () => {
	it('accepts a valid profile', () => {
		const profile = parseFingeringProfile(makeProfile());
		expect(profile.id).toBe('test-profile');
		expect(profile.fingers['KeyF']).toBe('left-index');
		expect(profile.homeKeys['right-thumb']).toBe('Space');
	});

	it.each([
		['a non-object', 42, 'fingering: expected an object'],
		['a wrong schema version', makeProfile({ schemaVersion: 0 }), 'fingering.schemaVersion'],
		['a missing id', makeProfile({ id: '' }), 'fingering.id'],
		['an unknown geometry', makeProfile({ geometry: 'jis' }), 'fingering.geometry'],
		['an unknown property', makeProfile({ extra: 1 }), 'fingering.extra'],
		['no fingers', makeProfile({ fingers: {}, homeKeys: {} }), 'fingering.fingers'],
		[
			'an invalid key code',
			makeProfile({ fingers: { 'key a': 'left-pinky' }, homeKeys: {} }),
			'fingering.fingers.key a'
		],
		[
			'an unknown finger',
			makeProfile({ fingers: { KeyA: 'left-toe' }, homeKeys: {} }),
			'fingering.fingers.KeyA'
		],
		[
			'a home key without a finger',
			makeProfile({ homeKeys: { 'left-pinky': 'KeyZ' } }),
			'fingering.homeKeys.left-pinky'
		],
		[
			'a home key assigned to another finger',
			makeProfile({ homeKeys: { 'left-pinky': 'KeyF' } }),
			'fingering.homeKeys.left-pinky'
		],
		[
			'a home key for an unknown finger',
			makeProfile({ homeKeys: { 'left-toe': 'KeyA' } }),
			'fingering.homeKeys.left-toe'
		]
	])('rejects %s with the faulty path', (_name, data, path) => {
		expect(() => parseFingeringProfile(data)).toThrow(path);
	});
});

describe('fingerForKey', () => {
	const profile = parseFingeringProfile(makeProfile());

	it('returns the finger assigned to a physical key', () => {
		expect(fingerForKey(profile, 'KeyF')).toBe('left-index');
		expect(fingerForKey(profile, 'Space')).toBe('right-thumb');
	});

	it('returns null for a key without assignment', () => {
		expect(fingerForKey(profile, 'KeyZ')).toBeNull();
	});

	it('does not read inherited object properties', () => {
		expect(fingerForKey(profile, 'constructor')).toBeNull();
		expect(fingerForKey(profile, 'toString')).toBeNull();
	});
});

describe('isReducedFingering', () => {
	const EIGHT_FINGERS = {
		KeyA: 'left-pinky',
		KeyS: 'left-ring',
		KeyD: 'left-middle',
		KeyF: 'left-index',
		KeyJ: 'right-index',
		KeyK: 'right-middle',
		KeyL: 'right-ring',
		Semicolon: 'right-pinky'
	};
	const homeKeysOf = (fingers: Record<string, string>) =>
		Object.fromEntries(Object.entries(fingers).map(([code, finger]) => [finger, code]));

	it('is false when each of the eight fingers has a key, whatever the thumbs do', () => {
		const fingers = { ...EIGHT_FINGERS, Space: 'right-thumb' };
		expect(isReducedFingering(parseFingeringProfile(makeProfile({ fingers, homeKeys: {} })))).toBe(
			false
		);
		const noThumb = parseFingeringProfile(
			makeProfile({ fingers: EIGHT_FINGERS, homeKeys: homeKeysOf(EIGHT_FINGERS) })
		);
		expect(isReducedFingering(noThumb)).toBe(false);
	});

	it('is true as soon as one finger of a hand has no key, thumbs aside', () => {
		const fingers: Record<string, string> = { ...EIGHT_FINGERS, Space: 'right-thumb' };
		delete fingers['Semicolon'];
		const withoutPinky = parseFingeringProfile(makeProfile({ fingers, homeKeys: {} }));
		expect(isReducedFingering(withoutPinky)).toBe(true);
	});
});
