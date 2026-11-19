import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The game judges the letter written, never the finger that typed it (P-23): the pages for adults
 * and professionals say it plainly, present hiding the hands or stickers as practices whose effect
 * is not shown, and the session sheet gives the adult what to watch, to tick by hand.
 */
const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const professionals = readFileSync('src/routes/pour-les-professionnels/+page.svelte', 'utf8');
const guide = readFileSync('src/routes/pour-les-adultes/+page.svelte', 'utf8');
const sheet = readFileSync('src/routes/adulte/SessionSheet.svelte', 'utf8');
const NOT_SEEN = /ne voit pas les doigts/;
const NOT_SHOWN = /effet non démontré/;

describe('the fingers, which the game does not see', () => {
	it('are said not to be seen on the sheet for professionals, among its limits', () => {
		expect(messages['pro_limit_fingers']).toMatch(NOT_SEEN);
		const limits = professionals.slice(professionals.indexOf('pro-limits'));
		expect(limits).toContain('m.pro_limit_fingers()');
	});

	it('are said not to be seen in the guide for adults, among its tips', () => {
		expect(messages['guide_tip_fingers']).toMatch(NOT_SEEN);
		expect(guide).toContain('m.guide_tip_fingers()');
	});

	it('come with the practices of the therapists, presented without a promise', () => {
		expect(messages['pro_limit_fingers']).toMatch(NOT_SHOWN);
		expect(messages['guide_tip_fingers']).toMatch(NOT_SHOWN);
	});

	it('are watched by the adult with the session sheet: four lines to tick', () => {
		expect(messages['adult_sheet_watch_intro']).toMatch(NOT_SEEN);
		const watch = /data-sheet-watch>([\s\S]*?)<\/section>/.exec(sheet)?.[1] ?? '';
		const lines = [...watch.matchAll(/m\.(adult_sheet_watch_\w+)\(\)/g)].map((match) => match[1]);
		expect(lines).toEqual([
			'adult_sheet_watch_title',
			'adult_sheet_watch_intro',
			'adult_sheet_watch_home',
			'adult_sheet_watch_return',
			'adult_sheet_watch_eyes',
			'adult_sheet_watch_shift'
		]);
	});
});
