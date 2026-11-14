import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) }
	},
	test: {
		environment: 'node',
		reporters: ['dot'],
		// Property tests run close to the default 5 s on a shared machine: a timeout is not a defect.
		testTimeout: 20_000,
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts']
	}
});
