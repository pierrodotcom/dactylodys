// Removes the agents' git worktrees that no longer serve: nothing uncommitted, and work already in
// `origin/main` or in a branch whose pull request is merged. Branches and commits are kept.
//   npm run clean:worktrees            -> lists what would be removed
//   npm run clean:worktrees -- --apply -> removes it
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const worktreesDir = join(root, '.claude', 'worktrees');
const apply = process.argv.includes('--apply');

const git = (args, cwd = root) =>
	execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const succeeds = (args) => {
	try {
		git(args);
		return true;
	} catch {
		return false;
	}
};

function listWorktrees() {
	const entries = [];
	let current = null;
	for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
		if (line.startsWith('worktree ')) {
			current = { path: resolve(line.slice('worktree '.length)), head: '', branch: null };
			entries.push(current);
		} else if (line.startsWith('HEAD ') && current) current.head = line.slice('HEAD '.length);
		else if (line.startsWith('branch ') && current)
			current.branch = line.slice('branch refs/heads/'.length);
	}
	return entries.filter((entry) => entry.path !== resolve(root));
}

function mergedPullRequestBranches() {
	try {
		const out = execFileSync(
			'gh',
			[
				'pr',
				'list',
				'--state',
				'merged',
				'--limit',
				'500',
				'--json',
				'headRefName',
				'--jq',
				'.[].headRefName'
			],
			{ cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
		);
		return new Set(out.split('\n').filter(Boolean));
	} catch {
		console.warn('gh unavailable: only work already in origin/main counts as merged.');
		return new Set();
	}
}

function whereMerged(head, mergedBranches) {
	if (succeeds(['merge-base', '--is-ancestor', head, 'origin/main'])) return 'origin/main';
	const remotes = git(['branch', '-r', '--contains', head])
		.split('\n')
		.map((name) => name.trim().replace(/^origin\//, ''))
		.filter(Boolean);
	const merged = remotes.find((name) => mergedBranches.has(name));
	return merged ? `PR fusionnée (${merged})` : null;
}

try {
	git(['fetch', '--quiet', 'origin']);
} catch {
	console.warn('git fetch failed: comparing with the last known origin/main.');
}

const mergedBranches = mergedPullRequestBranches();
const removable = [];
for (const worktree of listWorktrees()) {
	const name = basename(worktree.path);
	const label = `${name} [${worktree.branch ?? 'détaché'}]`;
	if (!existsSync(worktree.path)) {
		console.log(`absent       ${label}`);
		continue;
	}
	if (git(['status', '--porcelain'], worktree.path) !== '') {
		console.log(`GARDÉ        ${label} : modifications non enregistrées`);
		continue;
	}
	const merged = whereMerged(worktree.head, mergedBranches);
	if (!merged) {
		console.log(`GARDÉ        ${label} : travail pas encore fusionné`);
		continue;
	}
	console.log(`${apply ? 'retiré      ' : 'à retirer   '} ${label} : déjà dans ${merged}`);
	removable.push(worktree);
}

if (apply) {
	for (const worktree of removable) git(['worktree', 'remove', '--force', worktree.path]);
	git(['worktree', 'prune']);
}

const registered = new Set(listWorktrees().map((worktree) => worktree.path));
const strays = existsSync(worktreesDir)
	? readdirSync(worktreesDir).filter((entry) => !registered.has(resolve(worktreesDir, entry)))
	: [];
for (const stray of strays)
	console.log(
		`à examiner   ${stray} : présent dans .claude/worktrees sans être une copie de travail git`
	);

if (removable.length === 0) console.log('Rien à retirer.');
else if (!apply) console.log(`${removable.length} copie(s) à retirer : relancer avec --apply.`);
