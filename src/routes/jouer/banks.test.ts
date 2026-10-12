import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { loadBanks, type BankSources } from './banks';

const FRENCH = { locale: 'fr-FR' };

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function shipped(): BankSources {
	return {
		words: () => Promise.resolve(readJson('content/fr/words/base.json')),
		phrases: () => Promise.resolve(readJson('content/fr/phrases/base.json'))
	};
}

describe('loadBanks', () => {
	it('loads and validates both banks of the language', async () => {
		const report = vi.fn();

		const banks = await loadBanks(FRENCH, { fr: shipped() }, report);

		expect(banks.words?.id).toBe('fr.words.base');
		expect(banks.phrases?.id).toBe('fr.phrases.base');
		expect(report).not.toHaveBeenCalled();
	});

	it('goes on with the phrases and reports it when the words cannot be loaded', async () => {
		const report = vi.fn();
		const sources = { fr: { ...shipped(), words: () => Promise.reject(new Error('offline')) } };

		const banks = await loadBanks(FRENCH, sources, report);

		expect(banks.words).toBeUndefined();
		expect(banks.phrases?.id).toBe('fr.phrases.base');
		expect(report).toHaveBeenCalledTimes(1);
	});

	it('goes on with the words and reports it when the phrases are invalid', async () => {
		const report = vi.fn();
		const sources = { fr: { ...shipped(), phrases: () => Promise.resolve({ nonsense: true }) } };

		const banks = await loadBanks(FRENCH, sources, report);

		expect(banks.words?.id).toBe('fr.words.base');
		expect(banks.phrases).toBeUndefined();
		expect(report).toHaveBeenCalledTimes(1);
	});

	it('returns nothing, without a report, for a language that has no bank', async () => {
		const report = vi.fn();

		const banks = await loadBanks({ locale: 'de-DE' }, { fr: shipped() }, report);

		expect(banks).toEqual({});
		expect(report).not.toHaveBeenCalled();
	});

	it('writes the failure to the console by default', async () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const sources = {
			fr: { words: () => Promise.reject(new Error('offline')), phrases: shipped().phrases }
		};

		await loadBanks(FRENCH, sources);

		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockRestore();
	});
});
