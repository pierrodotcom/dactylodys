import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { adultSpace, INFO_PAGES } from './info-pages';

describe('the pages for adults', () => {
	it('each have their page among the routes', () => {
		for (const page of INFO_PAGES) {
			expect(existsSync(`src/routes${page.route}/+page.svelte`), page.route).toBe(true);
		}
		expect(new Set(INFO_PAGES.map((page) => page.id)).size).toBe(INFO_PAGES.length);
	});
});

describe('the adult space', () => {
	beforeEach(() => adultSpace.close());

	it('is closed until the gate is passed', () => {
		expect(adultSpace.isOpen()).toBe(false);
		adultSpace.open();
		expect(adultSpace.isOpen()).toBe(true);
	});

	it('stays open while the adult reads the pages for adults and comes back', () => {
		adultSpace.open();
		for (const page of INFO_PAGES) adultSpace.follow(page.route);
		adultSpace.follow('/adulte');
		expect(adultSpace.isOpen()).toBe(true);
	});

	it('closes as soon as the visit goes anywhere else', () => {
		for (const route of ['/', '/jouer', '/dev/traces', null]) {
			adultSpace.open();
			adultSpace.follow(route);
			expect(adultSpace.isOpen(), String(route)).toBe(false);
		}
	});

	it('is never opened by reading a page for adults', () => {
		for (const page of INFO_PAGES) adultSpace.follow(page.route);
		adultSpace.follow('/adulte');
		expect(adultSpace.isOpen()).toBe(false);
	});

	it('is still open on a page reached from another page of the adult space', () => {
		for (const from of ['/adulte', ...INFO_PAGES.map((page) => page.route)]) {
			adultSpace.open();
			expect(adultSpace.arrive(from), from).toBe(true);
			expect(adultSpace.isOpen(), from).toBe(true);
		}
	});

	/*
	 * A navigation started while another one was on its way runs no `beforeNavigate` (SvelteKit):
	 * the adult who left in a hurry did not close the space. The page reached from the game, or
	 * loaded, closes it whatever happened on the way (audit of the tests, ADR-087).
	 */
	it('is closed on a page of the adult space reached from anywhere else, whatever was missed', () => {
		for (const from of ['/', '/jouer', '/dev/traces', null]) {
			adultSpace.open();
			expect(adultSpace.arrive(from), String(from)).toBe(false);
			expect(adultSpace.isOpen(), String(from)).toBe(false);
		}
	});

	it('is never opened by arriving on one of its pages', () => {
		for (const from of ['/adulte', ...INFO_PAGES.map((page) => page.route), '/jouer', null]) {
			expect(adultSpace.arrive(from), String(from)).toBe(false);
		}
	});
});
