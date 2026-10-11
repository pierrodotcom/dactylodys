import { describe, expect, it } from 'vitest';
import {
	forgetLastPlayerId,
	LAST_PLAYER_KEY,
	readLastPlayerId,
	writeLastPlayerId,
	type StorageProvider
} from './last-player';

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

describe('last player memory', () => {
	it('finds nobody on a device where nobody has played', () => {
		expect(readLastPlayerId(memoryStorage().provider)).toBeNull();
	});

	it('gives back the identifier it was given', () => {
		const { provider } = memoryStorage();

		writeLastPlayerId('p-1', provider);

		expect(readLastPlayerId(provider)).toBe('p-1');
	});

	it('keeps only the most recent player', () => {
		const { provider, data } = memoryStorage();

		writeLastPlayerId('p-1', provider);
		writeLastPlayerId('p-2', provider);

		expect(readLastPlayerId(provider)).toBe('p-2');
		expect(data.size).toBe(1);
	});

	it('forgets the player', () => {
		const { provider } = memoryStorage();
		writeLastPlayerId('p-1', provider);

		forgetLastPlayerId(provider);

		expect(readLastPlayerId(provider)).toBeNull();
	});

	it('treats an empty value as nobody', () => {
		const { provider, data } = memoryStorage();
		data.set(LAST_PLAYER_KEY, '');

		expect(readLastPlayerId(provider)).toBeNull();
	});

	it('never throws when the storage is refused', () => {
		expect(readLastPlayerId(refusedStorage)).toBeNull();
		expect(() => writeLastPlayerId('p-1', refusedStorage)).not.toThrow();
		expect(() => forgetLastPlayerId(refusedStorage)).not.toThrow();
	});

	it('never throws when the storage fails on use', () => {
		const failing: StorageProvider = () => ({
			getItem: () => {
				throw new Error('quota');
			},
			setItem: () => {
				throw new Error('quota');
			},
			removeItem: () => {
				throw new Error('quota');
			}
		});

		expect(readLastPlayerId(failing)).toBeNull();
		expect(() => writeLastPlayerId('p-1', failing)).not.toThrow();
		expect(() => forgetLastPlayerId(failing)).not.toThrow();
	});
});
