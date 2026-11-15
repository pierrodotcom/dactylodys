import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import dactylodys from './tools/eslint/dactylodys-plugin.js';
import svelteConfig from './svelte.config.js';

const PURE_MODULE_FILES = ['src/lib/engine/**/*.ts', 'src/lib/keyboard/**/*.ts'];
const TEST_FILES = ['**/*.test.ts', '**/test-support.ts'];
const TYPED_LINT_FILES = [...PURE_MODULE_FILES, 'src/lib/state/**/*.ts'];
const BROWSER_GLOBALS = ['window', 'document', 'navigator'];
const DOM_RESTRICTIONS = BROWSER_GLOBALS.map((name) => ({
	name,
	message: 'engine/ and keyboard/ must not touch the DOM.'
}));
const HIDDEN_STATE_GLOBALS = [
	'performance',
	'setTimeout',
	'setInterval',
	'requestAnimationFrame',
	'localStorage',
	'sessionStorage',
	'indexedDB',
	'fetch',
	'crypto'
];
const HIDDEN_STATE_PROPERTIES = [
	['Math', 'random'],
	['Date', 'now']
];

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
		},
		rules: {
			// Invisible characters are written as escapes; the file tools turn escapes into the real thing (L-094).
			'no-irregular-whitespace': [
				'error',
				{ skipStrings: false, skipTemplates: false, skipRegExps: false, skipJSXText: false }
			]
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
			'no-restricted-globals': ['error', ...DOM_RESTRICTIONS]
		}
	},
	{
		// Determinism (rule 3 of the tests): clock, randomness, timers and storage are handed in by
		// the caller, never read from the environment. Tests may use them to build their cases.
		files: PURE_MODULE_FILES,
		ignores: TEST_FILES,
		rules: {
			'no-restricted-globals': [
				'error',
				...DOM_RESTRICTIONS,
				...HIDDEN_STATE_GLOBALS.map((name) => ({
					name,
					message: 'engine/ and keyboard/ are deterministic: take it as a parameter.'
				}))
			],
			'no-restricted-properties': [
				'error',
				...HIDDEN_STATE_PROPERTIES.map(([object, property]) => ({
					object,
					property,
					message: 'engine/ and keyboard/ are deterministic: take the value as a parameter.'
				}))
			]
		}
	},
	{
		// Rules that need the types: a promise nobody waits for, or an `any` that leaks, would go
		// unseen exactly where the data of the child is computed and stored (Q-21).
		files: TYPED_LINT_FILES,
		ignores: TEST_FILES,
		extends: [ts.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
		},
		rules: {
			// Not met yet by `state/` (journal.ts, migrations.ts, stores.ts: ten places): to turn on
			// with the lot that corrects them, then delete these three lines.
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/prefer-promise-reject-errors': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off'
		}
	}
);
