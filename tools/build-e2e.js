import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ALL_DEV_PAGES } from './lib/dev-pages.js';
import { writeSiteMark } from './lib/e2e-site.js';

/*
 * Builds the site the end-to-end tests run on: the published one plus every trial page of `/dev`
 * (ADR-075). `vite preview` serves it from `.svelte-kit/output`; `build/` is left as `npm run build`
 * made it, so that the tests can also look at what is really published. The site then carries the
 * mark of this copy, which Playwright waits for (L-149).
 */
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);

const { status } = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
	stdio: 'inherit',
	env: { ...process.env, [ALL_DEV_PAGES.variable]: ALL_DEV_PAGES.value }
});
if (status === 0) writeSiteMark(root);
process.exit(status ?? 1);
