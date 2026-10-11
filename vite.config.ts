import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// 5173/4173 (Vite defaults) belong to another project on the maintainer's machine.
const DEV_PORT = 5273;
const PREVIEW_PORT = 4273;

export default defineConfig({
	server: { port: DEV_PORT, strictPort: true },
	preview: { port: PREVIEW_PORT, strictPort: true },
	plugins: [paraglideVitePlugin({ project: './project.inlang' }), sveltekit()]
});
