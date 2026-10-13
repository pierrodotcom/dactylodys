import type { WordLevel } from '$lib/engine/progression/types';
import type { KeyCode } from '$lib/keyboard/types';
import rulesData from '../../../content/common/play-rules.json';

/** Rules of play that are not about learning: data, never constants in the code. */
export interface PlayRules {
	/** Cumulated play time after which a break is suggested. */
	readonly breakAfterMinutes: number;
	/** Highest level of the words and phrases of the banks that an exercise may use. */
	readonly maxWordLevel: WordLevel;
	/** Longest wait for the banks when a game starts; after that the child plays without them. */
	readonly bankLoadTimeoutMs: number;
	/**
	 * Pace of the ghost against the play it was recorded from: under 1 it is slower, so that a
	 * child who types as last time finishes ahead. Never above 1.
	 */
	readonly ghostPaceFactor: number;
	/**
	 * Physical keys the child is asked to press to check the keyboard. They are chosen
	 * where the layouts the game supports differ from other common ones (A, Z and M on AZERTY).
	 */
	readonly keyboardCheckCodes: readonly KeyCode[];
}

const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const WORD_LEVELS: readonly WordLevel[] = [1, 2, 3];

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePlayRules(data: unknown): PlayRules {
	if (!isRecord(data)) fail('playRules', 'expected an object');
	for (const name of Object.keys(data)) {
		if (
			![
				'schemaVersion',
				'breakAfterMinutes',
				'maxWordLevel',
				'bankLoadTimeoutMs',
				'ghostPaceFactor',
				'keyboardCheckCodes'
			].includes(name)
		) {
			fail(`playRules.${name}`, 'unknown property');
		}
	}
	if (data['schemaVersion'] !== 1) fail('playRules.schemaVersion', 'expected 1');

	const minutes = data['breakAfterMinutes'];
	if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
		fail('playRules.breakAfterMinutes', 'expected a positive number');
	}

	const maxWordLevel = WORD_LEVELS.find((level) => level === data['maxWordLevel']);
	if (maxWordLevel === undefined) {
		fail('playRules.maxWordLevel', `expected one of ${WORD_LEVELS.join(', ')}`);
	}

	const bankLoadTimeoutMs = data['bankLoadTimeoutMs'];
	if (
		typeof bankLoadTimeoutMs !== 'number' ||
		!Number.isFinite(bankLoadTimeoutMs) ||
		bankLoadTimeoutMs <= 0
	) {
		fail('playRules.bankLoadTimeoutMs', 'expected a positive number');
	}

	const ghostPaceFactor = data['ghostPaceFactor'];
	if (
		typeof ghostPaceFactor !== 'number' ||
		!Number.isFinite(ghostPaceFactor) ||
		ghostPaceFactor <= 0 ||
		ghostPaceFactor > 1
	) {
		fail('playRules.ghostPaceFactor', 'expected a number above 0 and up to 1');
	}

	const rawCodes = data['keyboardCheckCodes'];
	if (!Array.isArray(rawCodes) || rawCodes.length === 0) {
		fail('playRules.keyboardCheckCodes', 'expected a non-empty array');
	}
	const codes: KeyCode[] = [];
	rawCodes.forEach((code: unknown, index) => {
		const path = `playRules.keyboardCheckCodes[${index}]`;
		if (typeof code !== 'string' || !KEY_CODE_PATTERN.test(code)) fail(path, 'invalid key code');
		if (codes.includes(code)) fail(path, `duplicate key code "${code}"`);
		codes.push(code);
	});

	return {
		breakAfterMinutes: minutes,
		maxWordLevel,
		bankLoadTimeoutMs,
		ghostPaceFactor,
		keyboardCheckCodes: codes
	};
}

export const PLAY_RULES: PlayRules = parsePlayRules(rulesData);
