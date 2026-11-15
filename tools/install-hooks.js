import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

// Nothing to install without a repository (a package archive) nor where nobody commits (CI).
if (process.env.CI || !existsSync('.git')) {
	process.exit(0);
}

/*
 * The hooks format, lint and check commit messages. Without them a commit goes through unchecked
 * and nobody notices: a missing lefthook stops the installation instead of being a warning (Q-20).
 */
try {
	const lefthook = createRequire(import.meta.url).resolve('lefthook/bin/index.js');
	execFileSync(process.execPath, [lefthook, 'install'], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (error) {
	const detail = /** @type {{ stderr?: Buffer }} */ (error).stderr?.toString().trim();
	console.error(
		[
			'Git hooks were NOT installed: lefthook is missing or failed.',
			detail || String(error),
			'Run "npm ci", then "npx lefthook install". Commits made meanwhile are not checked.'
		].join('\n')
	);
	process.exit(1);
}
