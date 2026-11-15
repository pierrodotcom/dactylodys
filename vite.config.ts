import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { ALL_DEV_PAGES, isInternalDevPageFile } from './tools/lib/dev-pages.js';

// 5173/4173 (Vite defaults) belong to another project on the maintainer's machine.
const DEV_PORT = 5273;
const PREVIEW_PORT = 4273;

/**
 * The published site leaves out the internal trial pages of `/dev` (ADR-075). Their address
 * answers « not found » (`src/routes/dev/+layout.ts`); here their code is replaced by nothing, so
 * that no child downloads it nor keeps it for playing offline.
 */
function withoutInternalDevPages(): Plugin {
	return {
		name: 'dactylodys:without-internal-dev-pages',
		enforce: 'pre',
		apply: 'build',
		load(id) {
			if (process.env[ALL_DEV_PAGES.variable] === ALL_DEV_PAGES.value) return null;
			if (!isInternalDevPageFile(id)) return null;
			return id.endsWith('.svelte') ? '<!-- Left out of the published site. -->' : 'export {};';
		}
	};
}

export default defineConfig({
	server: { port: DEV_PORT, strictPort: true },
	preview: { port: PREVIEW_PORT, strictPort: true },
	plugins: [
		withoutInternalDevPages(),
		paraglideVitePlugin({ project: './project.inlang' }),
		sveltekit()
	]
});
