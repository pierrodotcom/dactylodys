import type { Page } from '@playwright/test';

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

/** Pathnames of every link of the page. */
export function linkedPaths(page: Page): Promise<string[]> {
	return page
		.getByRole('link')
		.evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).pathname));
}
