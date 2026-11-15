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
		/*
		 * « No third party » as a rule the browser enforces (principle 5): nothing is loaded from, nor
		 * sent to, another site. The pages are static, so the policy travels in a `<meta>` tag, with
		 * the hash of the one inline script SvelteKit writes. Styles keep `unsafe-inline`: the page
		 * shell carries a `style` attribute, and the end-to-end tests shorten the animations with a
		 * style element; a style cannot reach another site either, since images and fonts are `self`.
		 */
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self'],
				'font-src': ['self'],
				// `blob:`: the take just recorded on the voice page is played back from memory.
				'media-src': ['self', 'blob:'],
				'connect-src': ['self'],
				'worker-src': ['self'],
				'manifest-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['none']
			}
		},
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
