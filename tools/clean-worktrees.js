// Removes the agents' git worktrees that no longer serve: nothing uncommitted, and work already in
// `origin/main` or in a branch whose pull request is merged. Branches and commits are kept.
//   npm run clean:worktrees            -> lists what would be removed
//   npm run clean:worktrees -- --apply -> removes it
// A locked copy is never removed: it is listed with the command that unlocks it.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseWorktreeList, unlockCommand } from './lib/worktrees.js';

const apply = process.argv.includes('--apply');

/** @param {string[]} args */
const git = (args, cwd = process.cwd()) =>
	execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
/** @param {string[]} args */
const succeeds = (args) => {
	try {
		git(args);
		return true;
	} catch {
		return false;
	}
};

// The copy the command runs in, and the main repository, which holds the others: started from an
// agent's copy, the tool must offer to remove neither.
const here = resolve(git(['rev-parse', '--show-toplevel']));
const mainRoot = dirname(resolve(git(['rev-parse', '--path-format=absolute', '--git-common-dir'])));
const worktreesDir = join(mainRoot, '.claude', 'worktrees');

function listWorktrees() {
	return parseWorktreeList(git(['worktree', 'list', '--porcelain']))
		.map((entry) => ({ ...entry, path: resolve(entry.path) }))
		.filter((entry) => entry.path !== here && entry.path !== mainRoot);
}

function mergedPullRequestBranches() {
	// `gh` only knows pull requests of GitHub: elsewhere it would wait for nothing.
	if (!/github\.com/.test(git(['remote', 'get-url', 'origin']))) return new Set();
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
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
		);
		return new Set(out.split('\n').filter(Boolean));
	} catch {
		console.warn('gh unavailable: only work already in origin/main counts as merged.');
		return new Set();
	}
}

/**
 * @param {string} head
 * @param {Set<string>} mergedBranches
 */
function whereMerged(head, mergedBranches) {
	if (succeeds(['merge-base', '--is-ancestor', head, 'origin/main'])) return 'origin/main';
	const remotes = git(['branch', '-r', '--contains', head])
		.split('\n')
		.map((name) => name.trim().replace(/^origin\//, ''))
		.filter(Boolean);
	const merged = remotes.find((name) => mergedBranches.has(name));
	return merged ? `PR fusionnée (${merged})` : null;
}

/** @param {unknown} error */
function reasonOf(error) {
	const stderr = /** @type {{ stderr?: unknown }} */ (error)?.stderr;
	const text = typeof stderr === 'string' && stderr.trim() !== '' ? stderr : String(error);
	return text.trim().split(/\r?\n/).at(-1);
}

try {
	git(['fetch', '--quiet', 'origin']);
} catch {
	console.warn('git fetch failed: comparing with the last known origin/main.');
}

const mergedBranches = mergedPullRequestBranches();
const removable = [];
const locked = [];
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
	if (worktree.locked !== null) {
		const reason = worktree.locked === '' ? '' : ` (${worktree.locked})`;
		console.log(`VERROUILLÉE  ${label} : déjà dans ${merged}, mais verrouillée${reason}`);
		locked.push(worktree);
		continue;
	}
	console.log(`à retirer    ${label} : déjà dans ${merged}`);
	removable.push(worktree);
}

let removed = 0;
if (apply) {
	for (const worktree of removable) {
		try {
			git(['worktree', 'remove', '--force', worktree.path]);
			removed += 1;
			console.log(`retiré       ${basename(worktree.path)}`);
		} catch (error) {
			console.log(`NON RETIRÉ   ${basename(worktree.path)} : ${reasonOf(error)}`);
		}
	}
	git(['worktree', 'prune']);
}

const registered = new Set(
	parseWorktreeList(git(['worktree', 'list', '--porcelain'])).map((entry) => resolve(entry.path))
);
const strays = existsSync(worktreesDir)
	? readdirSync(worktreesDir).filter((entry) => !registered.has(resolve(worktreesDir, entry)))
	: [];
for (const stray of strays) {
	const path = join(worktreesDir, stray);
	const empty = statSync(path).isDirectory() && readdirSync(path).length === 0;
	if (!empty) {
		console.log(
			`à examiner   ${stray} : dans .claude/worktrees sans être une copie de travail git`
		);
	} else if (!apply) {
		console.log(`à retirer    ${stray} : dossier vide`);
	} else {
		try {
			rmdirSync(path);
			console.log(`retiré       ${stray} : dossier vide`);
		} catch (error) {
			console.log(`NON RETIRÉ   ${stray} : dossier vide, ${reasonOf(error)}`);
		}
	}
}

if (locked.length > 0) {
	console.log(
		`\n${locked.length} copie(s) verrouillée(s), jamais retirée(s) d'office. Si plus aucune session ne s'en sert, déverrouiller puis relancer :`
	);
	for (const worktree of locked) console.log(`  ${unlockCommand(worktree.path)}`);
}

if (!apply && removable.length > 0) {
	console.log(`${removable.length} copie(s) à retirer : relancer avec --apply.`);
} else if (apply && removable.length > 0) {
	console.log(`${removed} copie(s) retirée(s) sur ${removable.length}.`);
} else if (locked.length === 0) {
	console.log('Rien à retirer.');
}
