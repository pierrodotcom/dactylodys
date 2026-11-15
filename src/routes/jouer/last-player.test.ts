import { describe, expect, it } from 'vitest';
import {
	forgetLastPlayerId,
	LAST_PLAYER_KEY,
	lastPlayerFirst,
	readLastPlayerId,
	returningPlayer,
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

const LOU = { id: 'p-lou', name: 'Lou' };
const ALI = { id: 'p-ali', name: 'Ali' };
const ZOE = { id: 'p-zoe', name: 'Zoé' };

describe('returning player', () => {
	it('brings the only player of the device straight back to the game', () => {
		expect(returningPlayer([LOU], LOU.id)).toEqual({ last: LOU, resume: true, gone: false });
	});

	it('asks who plays as soon as the device has several players', () => {
		expect(returningPlayer([LOU, ALI], ALI.id)).toEqual({ last: ALI, resume: false, gone: false });
		expect(returningPlayer([LOU, ALI, ZOE], LOU.id).resume).toBe(false);
	});

	it('asks who plays when nobody is remembered, even with one player', () => {
		expect(returningPlayer([LOU], null)).toEqual({ last: null, resume: false, gone: false });
		expect(returningPlayer([], null)).toEqual({ last: null, resume: false, gone: false });
	});

	it('says the remembered player is gone when the device no longer has it', () => {
		expect(returningPlayer([LOU], 'p-deleted')).toEqual({ last: null, resume: false, gone: true });
		expect(returningPlayer([], LOU.id)).toEqual({ last: null, resume: false, gone: true });
	});
});

describe('order of the players', () => {
	it('puts the last player first and keeps the others in their order', () => {
		expect(lastPlayerFirst([LOU, ALI, ZOE], ZOE.id)).toEqual([ZOE, LOU, ALI]);
		expect(lastPlayerFirst([LOU, ALI, ZOE], ALI.id)).toEqual([ALI, LOU, ZOE]);
	});

	it('changes nothing when the last player is already first', () => {
		expect(lastPlayerFirst([LOU, ALI], LOU.id)).toEqual([LOU, ALI]);
	});

	it('keeps the order of the device when nobody is remembered or the player is gone', () => {
		const players = [LOU, ALI];

		expect(lastPlayerFirst(players, null)).toBe(players);
		expect(lastPlayerFirst(players, 'p-deleted')).toBe(players);
	});

	it('never loses nor repeats a player', () => {
		const ordered = lastPlayerFirst([LOU, ALI, ZOE], ALI.id);

		expect([...ordered].sort((a, b) => a.id.localeCompare(b.id))).toEqual([ALI, LOU, ZOE]);
	});
});
