import { describe, expect, it } from 'vitest';
import {
	readStorageProtection,
	requestStorageProtection,
	requestStorageProtectionOnce,
	STORAGE_ASKED_KEY,
	type FlagStorageProvider,
	type PersistenceProvider
} from './storage-persistence';

/** A browser that keeps the data once asked, when `grants`; `asked` counts the requests. */
function browser(options: { persisted?: boolean; grants?: boolean } = {}) {
	const state = { asked: 0, persisted: options.persisted ?? false };
	const provider: PersistenceProvider = () => ({
		persisted: () => Promise.resolve(state.persisted),
		persist: () => {
			state.asked += 1;
			state.persisted = state.persisted || (options.grants ?? false);
			return Promise.resolve(state.persisted);
		}
	});
	return { state, provider };
}

function flagsHolding(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial));
	const provider: FlagStorageProvider = () => ({
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => void values.set(key, value)
	});
	return { values, provider };
}

const refusing: FlagStorageProvider = () => {
	throw new DOMException('refused', 'SecurityError');
};

const failing: PersistenceProvider = () => ({
	persisted: () => Promise.reject(new Error('broken')),
	persist: () => Promise.reject(new Error('broken'))
});

describe('readStorageProtection', () => {
	it('says whether the browser promised to keep the data', async () => {
		expect(await readStorageProtection(browser({ persisted: true }).provider)).toBe('protected');
		expect(await readStorageProtection(browser().provider)).toBe('unprotected');
	});

	it('asks nothing of the browser', async () => {
		const { state, provider } = browser({ grants: true });
		await readStorageProtection(provider);
		expect(state.asked).toBe(0);
	});

	it('does not know where the browser does not say, or fails', async () => {
		expect(await readStorageProtection(() => undefined)).toBe('unknown');
		expect(await readStorageProtection(() => ({}))).toBe('unknown');
		expect(await readStorageProtection(failing)).toBe('unknown');
		expect(
			await readStorageProtection(() => {
				throw new ReferenceError('navigator is not defined');
			})
		).toBe('unknown');
	});
});

describe('requestStorageProtection', () => {
	it('gives what the browser answered', async () => {
		expect(await requestStorageProtection(browser({ grants: true }).provider)).toBe('protected');
		expect(await requestStorageProtection(browser({ grants: false }).provider)).toBe('unprotected');
	});

	it('does not ask a browser that already keeps the data', async () => {
		const { state, provider } = browser({ persisted: true });
		expect(await requestStorageProtection(provider)).toBe('protected');
		expect(state.asked).toBe(0);
	});

	it('asks a browser that cannot say whether it already keeps the data', async () => {
		let asked = 0;
		const provider: PersistenceProvider = () => ({
			persist: () => {
				asked += 1;
				return Promise.resolve(true);
			}
		});
		expect(await requestStorageProtection(provider)).toBe('protected');
		expect(asked).toBe(1);
	});

	it('never fails, whatever the browser does', async () => {
		expect(await requestStorageProtection(() => undefined)).toBe('unknown');
		expect(await requestStorageProtection(() => ({}))).toBe('unknown');
		expect(await requestStorageProtection(failing)).toBe('unknown');
	});
});

describe('requestStorageProtectionOnce', () => {
	it('asks the first time and remembers it under a technical key', async () => {
		const { state, provider } = browser({ grants: true });
		const flags = flagsHolding();

		expect(await requestStorageProtectionOnce(provider, flags.provider)).toBe('protected');

		expect(state.asked).toBe(1);
		expect([...flags.values.keys()]).toEqual([STORAGE_ASKED_KEY]);
		expect(STORAGE_ASKED_KEY).toBe('dactylodys.storage-asked');
	});

	it('never asks a second time on the same device, whatever the first answer', async () => {
		const { state, provider } = browser({ grants: false });
		const flags = flagsHolding();

		expect(await requestStorageProtectionOnce(provider, flags.provider)).toBe('unprotected');
		expect(await requestStorageProtectionOnce(provider, flags.provider)).toBeNull();
		expect(await requestStorageProtectionOnce(provider, flags.provider)).toBeNull();

		expect(state.asked).toBe(1);
	});

	it('remembers the request even when the browser fails to answer it', async () => {
		const flags = flagsHolding();
		expect(await requestStorageProtectionOnce(failing, flags.provider)).toBe('unknown');
		expect(await requestStorageProtectionOnce(failing, flags.provider)).toBeNull();
	});

	it('does not ask a device that cannot remember the request', async () => {
		const { state, provider } = browser({ grants: true });
		expect(await requestStorageProtectionOnce(provider, refusing)).toBeNull();
		expect(state.asked).toBe(0);
	});
});
