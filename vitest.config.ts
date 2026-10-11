import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	},
	test: {
		environment: 'node',
		reporters: ['dot'],
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts']
	}
});
