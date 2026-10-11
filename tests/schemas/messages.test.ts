import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const SCHEMA_KEY = '$schema';

type InlangSettings = { baseLocale: string; locales: string[] };

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function messageKeys(locale: string): string[] {
	const messages = readJson<Record<string, unknown>>(`messages/${locale}.json`);
	return Object.keys(messages).filter((key) => key !== SCHEMA_KEY);
}

const settings = readJson<InlangSettings>('project.inlang/settings.json');

describe('inlang settings', () => {
	it('declares the base locale among its locales', () => {
		expect(settings.locales).toContain(settings.baseLocale);
	});
});

describe.each(settings.locales)('messages/%s.json', (locale) => {
	it('exists', () => {
		expect(existsSync(`messages/${locale}.json`)).toBe(true);
	});

	it('has exactly the same keys as the base locale', () => {
		expect(messageKeys(locale).sort()).toEqual(messageKeys(settings.baseLocale).sort());
	});

	it('uses snake_case keys only', () => {
		const invalid = messageKeys(locale).filter((key) => !SNAKE_CASE.test(key));
		expect(invalid).toEqual([]);
	});

	it('has no empty value', () => {
		const messages = readJson<Record<string, unknown>>(`messages/${locale}.json`);
		const empty = messageKeys(locale).filter((key) => {
			const value = messages[key];
			return typeof value !== 'string' || value.trim() === '';
		});
		expect(empty).toEqual([]);
	});
});
