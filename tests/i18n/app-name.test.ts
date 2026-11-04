import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The name of the app may change: it is written once per language, in `app_name`, and every other
// text takes it as a parameter (ADR-055).
const locales = readdirSync('messages').filter((file) => file.endsWith('.json'));

describe.each(locales)('the messages of %s', (file) => {
	const messages = JSON.parse(readFileSync(`messages/${file}`, 'utf8')) as Record<string, string>;
	const appName = messages['app_name'];

	it('give the name of the app', () => {
		expect(appName?.trim()).toBeTruthy();
	});

	it('never write that name anywhere else', () => {
		const others = Object.entries(messages).filter(
			([key, text]) =>
				key !== 'app_name' &&
				key !== '$schema' &&
				text.toLowerCase().includes(String(appName).toLowerCase())
		);

		expect(others.map(([key]) => key)).toEqual([]);
	});
});
