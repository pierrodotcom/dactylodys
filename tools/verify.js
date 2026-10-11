import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const STEPS = [
	{ name: 'generate', command: 'npm run -s generate' },
	{ name: 'check', command: 'npm run -s --ignore-scripts check' },
	{ name: 'lint', command: 'npm run -s --ignore-scripts lint' },
	{ name: 'test', command: 'npm run -s test', summary: /Tests\s+\d+ passed/ },
	{ name: 'build', command: 'npm run -s --ignore-scripts build' },
	{ name: 'e2e', command: 'npx --no-install playwright test', summary: /\d+ passed/ }
];

/** @param {string} command */
function run(command) {
	return new Promise((resolve) => {
		const child = spawn(command, {
			shell: true,
			env: { ...process.env, FORCE_COLOR: undefined, NO_COLOR: '1' }
		});
		let output = '';
		child.stdout.on('data', (chunk) => (output += chunk));
		child.stderr.on('data', (chunk) => (output += chunk));
		child.on('close', (code) => resolve({ code: code ?? 1, output }));
	});
}

const started = Date.now();
for (const step of STEPS) {
	const stepStarted = Date.now();
	const { code, output } = await run(step.command);
	if (code !== 0) {
		console.error(`FAIL ${step.name}\n\n${output.trim()}`);
		process.exit(code);
	}
	const seconds = ((Date.now() - stepStarted) / 1000).toFixed(1);
	const detail = step.summary ? output.match(step.summary)?.[0] : undefined;
	console.log(`ok   ${step.name.padEnd(8)} ${seconds}s${detail ? `  ${detail}` : ''}`);
}
console.log(`verify passed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
