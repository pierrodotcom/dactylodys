import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { ALL_DEV_PAGES, E2E_SITE_DIRECTORY, isInternalDevRoute } from './tools/lib/dev-pages.js';

const BASE_PATH = process.env.BASE_PATH ?? '';
/** Only for the end-to-end tests: the published site leaves the internal trial pages out (ADR-075). */
const WITH_EVERY_DEV_PAGE = process.env[ALL_DEV_PAGES.variable] === ALL_DEV_PAGES.value;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// The site with every trial page is written apart: `build/` only ever holds what is published.
		adapter: adapter(WITH_EVERY_DEV_PAGE ? { pages: E2E_SITE_DIRECTORY } : undefined),
		prerender: {
			handleHttpError: ({ path, status, message }) => {
				const route = path.slice(BASE_PATH.length);
				if (!WITH_EVERY_DEV_PAGE && status === 404 && isInternalDevRoute(route)) return;
				throw new Error(message);
			}
		},
		serviceWorker: {
			// Dotfiles of `static/` (`.nojekyll`) are for the host, which does not serve them.
			files: (file) => !file.split('/').some((part) => part.startsWith('.'))
		},
		paths: {
			base: BASE_PATH
		},
		typescript: {
			config: (config) => ({
				...config,
				include: [
					...config.include,
					'../e2e/**/*.ts',
					'../playwright.config.ts',
					'../vitest.config.ts'
				]
			})
		}
	}
};

export default config;
