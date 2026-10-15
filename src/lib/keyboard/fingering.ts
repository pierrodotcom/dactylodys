import type { Finger, FingeringProfile, KeyCode, KeyPress, KeyboardGeometry } from './types';

const GEOMETRIES: readonly KeyboardGeometry[] = ['iso', 'ansi'];
const FINGERS: readonly Finger[] = [
	'left-pinky',
	'left-ring',
	'left-middle',
	'left-index',
	'left-thumb',
	'right-thumb',
	'right-index',
	'right-middle',
	'right-ring',
	'right-pinky'
];
const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) fail(path, 'expected an object');
	return value;
}

function expectOneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
	const found = allowed.find((candidate) => candidate === value);
	if (found === undefined) fail(path, `expected one of ${allowed.join(', ')}`);
	return found;
}

function expectKeyCode(value: unknown, path: string): KeyCode {
	if (typeof value !== 'string' || !KEY_CODE_PATTERN.test(value)) fail(path, 'invalid key code');
	return value;
}

export function parseFingeringProfile(data: unknown): FingeringProfile {
	const root = expectRecord(data, 'fingering');
	for (const name of Object.keys(root)) {
		if (!['schemaVersion', 'id', 'geometry', 'fingers', 'homeKeys'].includes(name)) {
			fail(`fingering.${name}`, 'unknown property');
		}
	}
	if (root['schemaVersion'] !== 1) fail('fingering.schemaVersion', 'expected 1');
	const id = root['id'];
	if (typeof id !== 'string' || id === '') fail('fingering.id', 'expected a non-empty string');
	const geometry = expectOneOf(root['geometry'], GEOMETRIES, 'fingering.geometry');

	const rawFingers = expectRecord(root['fingers'], 'fingering.fingers');
	if (Object.keys(rawFingers).length === 0) fail('fingering.fingers', 'expected at least one key');
	const fingers: Record<KeyCode, Finger> = Object.fromEntries(
		Object.entries(rawFingers).map(([code, finger]) => [
			expectKeyCode(code, `fingering.fingers.${code}`),
			expectOneOf(finger, FINGERS, `fingering.fingers.${code}`)
		])
	);

	const rawHomeKeys = expectRecord(root['homeKeys'], 'fingering.homeKeys');
	const homeKeys: Partial<Record<Finger, KeyCode>> = Object.fromEntries(
		Object.entries(rawHomeKeys).map(([finger, code]) => {
			const path = `fingering.homeKeys.${finger}`;
			const checkedFinger = expectOneOf(finger, FINGERS, path);
			const checkedCode = expectKeyCode(code, path);
			if (!Object.hasOwn(fingers, checkedCode)) fail(path, `key ${checkedCode} has no finger`);
			if (fingers[checkedCode] !== checkedFinger) {
				fail(path, `key ${checkedCode} is assigned to ${fingers[checkedCode]}`);
			}
			return [checkedFinger, checkedCode];
		})
	);

	return { schemaVersion: 1, id, geometry, fingers, homeKeys };
}

export function fingerForKey(profile: FingeringProfile, code: KeyCode): Finger | null {
	return Object.hasOwn(profile.fingers, code) ? (profile.fingers[code] ?? null) : null;
}

const SHIFT_BY_OPPOSITE_HAND = { left: 'ShiftRight', right: 'ShiftLeft' } as const;
const DEFAULT_SHIFT = 'ShiftLeft';
const ALTGR = 'AltRight';

/** Modifier keys to hold for a press: Shift on the hand opposite to the typing finger, then AltGr. */
export function modifierCodes(press: KeyPress, profile: FingeringProfile): KeyCode[] {
	const needsShift = press.level === 'shift' || press.level === 'shiftAltgr';
	const needsAltgr = press.level === 'altgr' || press.level === 'shiftAltgr';
	const hand = fingerForKey(profile, press.code)?.split('-')[0];
	const shift = hand === 'left' || hand === 'right' ? SHIFT_BY_OPPOSITE_HAND[hand] : DEFAULT_SHIFT;
	return [...(needsShift ? [shift] : []), ...(needsAltgr ? [ALTGR] : [])];
}
