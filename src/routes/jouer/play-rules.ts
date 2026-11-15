import { parseWordLimitRules, type WordLimitRules } from '$lib/engine/progression/word-limits';
import type { KeyCode } from '$lib/keyboard/types';
import { SESSION_LENGTHS } from '$lib/state/profile';
import type { SessionLength } from '$lib/state/types';
import rulesData from '../../../content/common/play-rules.json';

/** When the game proposes to stop for today, for one length of session: data, never constants. */
export interface SessionLengthRules {
	/**
	 * Minutes spent typing since the session began (the active time of the plays, ADR-077) from
	 * which a break is suggested, after the first worlds.
	 */
	readonly typingMinutes: number;
	/** Minutes spent in the games after which a break is suggested whatever was typed. */
	readonly clockMinutes: number;
	/** Finished exercises from which a break is suggested in the first worlds; 0: never. */
	readonly earlyExercises: number;
	/** The same in the worlds after them; 0: never, the time spent typing decides. */
	readonly exercises: number;
}

/**
 * Rules of play that are not about learning: data, never constants in the code. The level and the
 * length of the words (`maxWordLevel`, `wordLevels`, `shortWords`) are read by `wordLimits`.
 */
export interface PlayRules extends WordLimitRules {
	/** When a break is suggested, for each length of session the adult can choose (ADR-075). */
	readonly sessionLengths: Readonly<Record<SessionLength, SessionLengthRules>>;
	/**
	 * Worlds, counted from the first one, where the break is suggested after a number of exercises
	 * (`earlyExercises`) rather than on the time spent typing: a beginner tires sooner than its
	 * typing time says. 0: none.
	 */
	readonly earlyWorlds: number;
	/** Longest wait for the banks when a game starts; after that the child plays without them. */
	readonly bankLoadTimeoutMs: number;
	/**
	 * Pace of the ghost against the play it was recorded from: under 1 it is slower, so that a
	 * child who types as last time finishes ahead. Never above 1.
	 */
	readonly ghostPaceFactor: number;
	/**
	 * Every so many groups, between two groups, the child is reminded to look at the screen rather
	 * than at the keys; 0: never.
	 */
	readonly lookReminderEveryGroups: number;
	/**
	 * Physical keys the child is asked to press to check the keyboard. They are chosen
	 * where the layouts the game supports differ from other common ones (A, Z and M on AZERTY).
	 */
	readonly keyboardCheckCodes: readonly KeyCode[];
}

const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectCount(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
		fail(path, 'expected an integer of at least 0');
	}
	return value;
}

function expectMinutes(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		fail(path, 'expected a positive number');
	}
	return value;
}

function parseSessionLength(data: unknown, path: string): SessionLengthRules {
	if (!isRecord(data)) fail(path, 'expected an object');
	const names = ['typingMinutes', 'clockMinutes', 'earlyExercises', 'exercises'];
	for (const name of Object.keys(data)) {
		if (!names.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
	const typingMinutes = expectMinutes(data['typingMinutes'], `${path}.typingMinutes`);
	const clockMinutes = expectMinutes(data['clockMinutes'], `${path}.clockMinutes`);
	if (clockMinutes < typingMinutes) {
		fail(`${path}.clockMinutes`, 'expected at least the minutes spent typing (typingMinutes)');
	}
	return {
		typingMinutes,
		clockMinutes,
		earlyExercises: expectCount(data['earlyExercises'], `${path}.earlyExercises`),
		exercises: expectCount(data['exercises'], `${path}.exercises`)
	};
}

export function parsePlayRules(data: unknown): PlayRules {
	if (!isRecord(data)) fail('playRules', 'expected an object');
	for (const name of Object.keys(data)) {
		if (
			![
				'schemaVersion',
				'sessionLengths',
				'earlyWorlds',
				'maxWordLevel',
				'wordLevels',
				'shortWords',
				'bankLoadTimeoutMs',
				'ghostPaceFactor',
				'lookReminderEveryGroups',
				'keyboardCheckCodes'
			].includes(name)
		) {
			fail(`playRules.${name}`, 'unknown property');
		}
	}
	if (data['schemaVersion'] !== 1) fail('playRules.schemaVersion', 'expected 1');

	const rawLengths = data['sessionLengths'];
	if (!isRecord(rawLengths)) fail('playRules.sessionLengths', 'expected an object');
	for (const name of Object.keys(rawLengths)) {
		if (!SESSION_LENGTHS.some((length) => length === name)) {
			fail(`playRules.sessionLengths.${name}`, 'unknown length of session');
		}
	}
	const sessionLengths: Readonly<Record<SessionLength, SessionLengthRules>> = {
		short: parseSessionLength(rawLengths['short'], 'playRules.sessionLengths.short'),
		normal: parseSessionLength(rawLengths['normal'], 'playRules.sessionLengths.normal'),
		long: parseSessionLength(rawLengths['long'], 'playRules.sessionLengths.long')
	};
	// A longer session never proposes its break sooner than a shorter one.
	SESSION_LENGTHS.forEach((name, index) => {
		const shorter = SESSION_LENGTHS[index - 1];
		if (shorter === undefined) return;
		for (const minutes of ['typingMinutes', 'clockMinutes'] as const) {
			if (sessionLengths[name][minutes] < sessionLengths[shorter][minutes]) {
				fail(
					`playRules.sessionLengths.${name}.${minutes}`,
					`expected at least as much as ${shorter}`
				);
			}
		}
	});
	const earlyWorlds = expectCount(data['earlyWorlds'], 'playRules.earlyWorlds');

	const wordLimitRules = parseWordLimitRules(data, 'playRules');

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

	const lookReminderEveryGroups = data['lookReminderEveryGroups'];
	if (
		typeof lookReminderEveryGroups !== 'number' ||
		!Number.isSafeInteger(lookReminderEveryGroups) ||
		lookReminderEveryGroups < 0
	) {
		fail('playRules.lookReminderEveryGroups', 'expected an integer of at least 0');
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
		sessionLengths,
		earlyWorlds,
		...wordLimitRules,
		bankLoadTimeoutMs,
		ghostPaceFactor,
		lookReminderEveryGroups,
		keyboardCheckCodes: codes
	};
}

export const PLAY_RULES: PlayRules = parsePlayRules(rulesData);

/** The length of session of a profile whose adult chose none. */
export const USUAL_SESSION_LENGTH: SessionLength = 'normal';

/** What the pages for adults say of the break of a session: read from the rules, never written. */
export interface BreakFacts {
	/** Exercises after which the break is proposed in the first worlds. */
	readonly exercises: number;
	/** Minutes spent typing after which it is proposed in the worlds after them. */
	readonly typing: number;
	/** Minutes spent in the games after which it is proposed anyway. */
	readonly minutes: number;
}

export function breakFacts(
	rules: Pick<PlayRules, 'sessionLengths'>,
	length: SessionLength = USUAL_SESSION_LENGTH
): BreakFacts {
	const { earlyExercises, typingMinutes, clockMinutes } = rules.sessionLengths[length];
	return { exercises: earlyExercises, typing: typingMinutes, minutes: clockMinutes };
}
