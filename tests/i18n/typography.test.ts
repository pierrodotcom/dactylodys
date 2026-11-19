import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * French typography of the interface (audit C-06, choice 17 of ADR-075): a sign never starts a line
 * on its own (ADR-023), so a no-break space comes before « : ; ! ? » and « » », after « « », and
 * between a number and « % »; the apostrophe is straight, as the key the child learns. The matter
 * to type keeps its ordinary spaces (ADR-023): it lives in `content/`, not here. The sample texts
 * of the settings are matter to type too.
 */
const SAMPLE = /^(dev_ui_sample_text|settings_sample_text|dev_ui_listen_sample_\w+)$/;

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const shown = Object.entries(messages).filter(([key]) => key !== '$schema' && !SAMPLE.test(key));

function offending(pattern: RegExp): string[] {
	return shown.filter(([, text]) => pattern.test(text)).map(([key]) => key);
}

describe('the typography of the messages', () => {
	it('puts no ordinary space before a colon, a semicolon, a question or exclamation mark', () => {
		expect(offending(/ [:;!?]/u)).toEqual([]);
	});

	it('puts no ordinary space inside French quotation marks', () => {
		expect(offending(/« | »/u)).toEqual([]);
	});

	it('keeps a percentage with its number', () => {
		expect(offending(/[\d}] %/u)).toEqual([]);
	});

	it('writes the apostrophe straight, as on the key of the keyboard', () => {
		expect(offending(/[\u2018\u2019]/u)).toEqual([]);
	});

	it('uses the no-break space it asks for, in many messages', () => {
		expect(offending(/\u00a0[:;!?»]/u).length).toBeGreaterThan(100);
	});
});
