import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		paths: {
			base: process.env.BASE_PATH ?? ''
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
