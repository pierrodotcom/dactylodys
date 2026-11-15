import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ALL_DEV_PAGES } from './lib/dev-pages.js';

/*
 * Builds the site the end-to-end tests run on: the published one plus every trial page of `/dev`
 * (ADR-075). `vite preview` serves it from `.svelte-kit/output`; `build/` is left as `npm run build`
 * made it, so that the tests can also look at what is really published.
 */
process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const { status } = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
	stdio: 'inherit',
	env: { ...process.env, [ALL_DEV_PAGES.variable]: ALL_DEV_PAGES.value }
});
process.exit(status ?? 1);
