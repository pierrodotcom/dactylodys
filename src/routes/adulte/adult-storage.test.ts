import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StorageProvider } from '../jouer/last-player';
import {
	ADULT_CODE_KEY,
	isCodeAnswer,
	isValidCode,
	LAST_BACKUP_KEY,
	readAdultCode,
	readLastBackupAt,
	removeAdultCode,
	writeAdultCode,
	writeLastBackupAt
} from './adult-storage';

const LENGTH = 4;

function memoryStorage(): { provider: StorageProvider; data: Map<string, string> } {
	const data = new Map<string, string>();
	const provider: StorageProvider = () => ({
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, value),
		removeItem: (key) => void data.delete(key)
	});
	return { provider, data };
}

const refusedStorage: StorageProvider = () => {
	throw new DOMException('Access denied', 'SecurityError');
};

describe('isValidCode', () => {
	it('accepts exactly four digits', () => {
		expect(isValidCode('0042', LENGTH)).toBe(true);
	});

	it.each(['', '123', '12345', '12a4', ' 123', '１２３４'])('refuses "%s"', (text) => {
		expect(isValidCode(text, LENGTH)).toBe(false);
	});
});

describe('the code of the adult space', () => {
	it('is absent on a new device', () => {
		expect(readAdultCode(LENGTH, memoryStorage().provider)).toEqual({ status: 'none' });
	});

	it('is kept under its technical key and asked back', () => {
		const { provider, data } = memoryStorage();
		expect(writeAdultCode('2580', LENGTH, provider)).toBe(true);
		expect(data.get(ADULT_CODE_KEY)).toBe('2580');
		const stored = readAdultCode(LENGTH, provider);
		expect(isCodeAnswer(stored, '2580')).toBe(true);
		expect(isCodeAnswer(stored, '2581')).toBe(false);
	});

	it('accepts only the stored code, whatever is typed', () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[0-9]{4}$/), fc.string(), (code, typed) => {
				const { provider } = memoryStorage();
				writeAdultCode(code, LENGTH, provider);
				expect(isCodeAnswer(readAdultCode(LENGTH, provider), typed)).toBe(typed.trim() === code);
			})
		);
	});

	it('refuses to keep a code that is not four digits', () => {
		const { provider, data } = memoryStorage();
		expect(writeAdultCode('12', LENGTH, provider)).toBe(false);
		expect(data.size).toBe(0);
	});

	it('counts a damaged stored value as no code', () => {
		const { provider, data } = memoryStorage();
		data.set(ADULT_CODE_KEY, 'abc');
		expect(readAdultCode(LENGTH, provider)).toEqual({ status: 'none' });
	});

	it('can be removed', () => {
		const { provider } = memoryStorage();
		writeAdultCode('2580', LENGTH, provider);
		expect(removeAdultCode(provider)).toBe(true);
		expect(readAdultCode(LENGTH, provider)).toEqual({ status: 'none' });
	});

	it('says when the storage cannot be reached, and never lets a code through then', () => {
		const stored = readAdultCode(LENGTH, refusedStorage);
		expect(stored).toEqual({ status: 'unavailable' });
		expect(isCodeAnswer(stored, '0000')).toBe(false);
		expect(writeAdultCode('2580', LENGTH, refusedStorage)).toBe(false);
		expect(removeAdultCode(refusedStorage)).toBe(false);
	});
});

describe('the date of the last backup', () => {
	it('is unknown on a new device', () => {
		expect(readLastBackupAt(memoryStorage().provider)).toBeNull();
	});

	it('gives back the moment it was given', () => {
		const { provider, data } = memoryStorage();
		expect(writeLastBackupAt(1_700_000_000_000, provider)).toBe(true);
		expect(data.get(LAST_BACKUP_KEY)).toBe('1700000000000');
		expect(readLastBackupAt(provider)).toBe(1_700_000_000_000);
	});

	it('ignores a damaged value and a refused storage', () => {
		const { provider, data } = memoryStorage();
		data.set(LAST_BACKUP_KEY, 'hier');
		expect(readLastBackupAt(provider)).toBeNull();
		expect(readLastBackupAt(refusedStorage)).toBeNull();
		expect(writeLastBackupAt(1, refusedStorage)).toBe(false);
	});
});
