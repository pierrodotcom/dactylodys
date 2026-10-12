import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** SvelteKit adds its announcer once the client app has taken over the page. */
const HYDRATION_SIGNAL = '#svelte-announcer';

/** Acting before hydration loses clicks and keystrokes: wait until the page reacts. */
export async function waitForHydration(page: Page): Promise<void> {
	await page.locator(HYDRATION_SIGNAL).waitFor({ state: 'attached' });
}

export async function openPage(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await waitForHydration(page);
}

export async function reloadPage(page: Page): Promise<void> {
	await page.reload();
	await waitForHydration(page);
}

export function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')) as T;
}

type MessageParams = Record<string, string | number>;

/** The French messages of the interface, read from the source file the app is built from. */
export function loadMessages() {
	const messages = readJson<Record<string, string>>('messages/fr.json');

	function message(key: string, params: MessageParams = {}): string {
		const template = messages[key] ?? key;
		return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
	}

	function plural(key: string, count: number, params: MessageParams = {}): string {
		const form = new Intl.PluralRules('fr').select(count) === 'one' ? 'one' : 'other';
		return message(`${key}_${form}`, { count, ...params });
	}

	/** A regular expression for a message with `{text}` and `{char}`; `text` is captured. */
	function templateRegex(key: string): RegExp {
		const escaped = (messages[key] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = escaped.replace('\\{text\\}', '(?<text>.*)').replace('\\{char\\}', '.*');
		return new RegExp(`^${pattern}$`, 's');
	}

	/** Keys `<prefix>1`, `<prefix>2`… in order. */
	function numbered(prefix: string): string[] {
		return Object.keys(messages).filter((key) => new RegExp(`^${prefix}\\d+$`).test(key));
	}

	return { message, plural, templateRegex, numbered };
}

/** Pathnames of every link of the page. */
export function linkedPaths(page: Page): Promise<string[]> {
	return page
		.getByRole('link')
		.evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
}
