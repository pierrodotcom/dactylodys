import { describe, expect, it } from 'vitest';
import { fingerForKey, parseFingeringProfile } from './fingering';

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
