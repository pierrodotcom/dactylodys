import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import dactylodys from './tools/eslint/dactylodys-plugin.js';
import svelteConfig from './svelte.config.js';

const PURE_MODULE_FILES = ['src/lib/engine/**/*.ts', 'src/lib/keyboard/**/*.ts'];
const BROWSER_GLOBALS = ['window', 'document', 'navigator'];

export default defineConfig(
	globalIgnores([
		'.claude/',
		'.svelte-kit/',
		'build/',
		'dist/',
		'coverage/',
		'playwright-report/',
		'test-results/',
		'node_modules/',
		'src/lib/generated/',
		'src/lib/paraglide/'
	]),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.svelte']
			},
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		files: ['**/*.svelte'],
		plugins: { dd: dactylodys },
		rules: {
			'svelte/no-inline-styles': 'error',
			'dd/no-hardcoded-text': 'error'
		}
	},
	{
		files: PURE_MODULE_FILES,
		languageOptions: {
			globals: Object.fromEntries(BROWSER_GLOBALS.map((name) => [name, 'off']))
		},
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['svelte', 'svelte/*', '$app/*'],
							message: 'engine/ and keyboard/ must stay framework-free pure TypeScript.'
						}
					]
				}
			],
			'no-restricted-globals': [
				'error',
				...BROWSER_GLOBALS.map((name) => ({
					name,
					message: 'engine/ and keyboard/ must not touch the DOM.'
				}))
			]
		}
	}
);
