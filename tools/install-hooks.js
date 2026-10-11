import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

if (process.env.CI || !existsSync('.git')) {
	process.exit(0);
}

try {
	const lefthook = createRequire(import.meta.url).resolve('lefthook/bin/index.js');
	execFileSync(process.execPath, [lefthook, 'install'], { stdio: 'ignore' });
} catch {
	console.warn('Git hooks not installed (lefthook unavailable). Run "npx lefthook install".');
}
