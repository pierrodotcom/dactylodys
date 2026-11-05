import type { StorageProvider } from '../jouer/last-player';

/*
 * Technical keys of the local storage of the device: they never change with the name of the app
 * (ADR-055). The code is erased only with the data of the site.
 */
export const ADULT_CODE_KEY = 'dactylodys.adult-code';
export const LAST_BACKUP_KEY = 'dactylodys.last-backup-at';

const browserStorage: StorageProvider = () => localStorage;
const ASCII_DIGITS = /^[0-9]+$/;

/** `unavailable`: the browser refuses the local storage (private browsing, blocked site data). */
export type StoredCode =
	| { readonly status: 'none' }
	| { readonly status: 'set'; readonly code: string }
	| { readonly status: 'unavailable' };

/** A code of exactly `length` digits 0 to 9. */
export function isValidCode(text: string, length: number): boolean {
	return text.length === length && ASCII_DIGITS.test(text);
}

/**
 * The code of the adult space. A stored value that is not a valid code counts as no code: a
 * damaged value never shuts the adult out.
 */
export function readAdultCode(
	length: number,
	storage: StorageProvider = browserStorage
): StoredCode {
	try {
		const code = storage().getItem(ADULT_CODE_KEY);
		return code !== null && isValidCode(code, length)
			? { status: 'set', code }
			: { status: 'none' };
	} catch {
		return { status: 'unavailable' };
	}
}

/** Whether the code typed is the one stored; always `false` without a code. */
export function isCodeAnswer(stored: StoredCode, typed: string): boolean {
	return stored.status === 'set' && typed.trim() === stored.code;
}

/** `false` when the code is not valid or the device refuses to keep it. */
export function writeAdultCode(
	code: string,
	length: number,
	storage: StorageProvider = browserStorage
): boolean {
	if (!isValidCode(code, length)) return false;
	try {
		storage().setItem(ADULT_CODE_KEY, code);
		return true;
	} catch {
		return false;
	}
}

export function removeAdultCode(storage: StorageProvider = browserStorage): boolean {
	try {
		storage().removeItem(ADULT_CODE_KEY);
		return true;
	} catch {
		return false;
	}
}

/** When a backup file was last made on this device; `null` when never, or unknown. */
export function readLastBackupAt(storage: StorageProvider = browserStorage): number | null {
	try {
		const text = storage().getItem(LAST_BACKUP_KEY);
		if (text === null || !ASCII_DIGITS.test(text)) return null;
		const at = Number(text);
		return Number.isSafeInteger(at) ? at : null;
	} catch {
		return null;
	}
}

export function writeLastBackupAt(at: number, storage: StorageProvider = browserStorage): boolean {
	if (!Number.isSafeInteger(at) || at < 0) return false;
	try {
		storage().setItem(LAST_BACKUP_KEY, String(at));
		return true;
	} catch {
		return false;
	}
}
