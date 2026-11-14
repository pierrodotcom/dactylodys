import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseWorktreeList, unlockCommand } from '../../tools/lib/worktrees.js';

const TOOL = resolve('tools/clean-worktrees.js');
/** Each step runs a dozen git commands, slow on a busy Windows machine. */
const SLOW = 120_000;

describe('parseWorktreeList', () => {
	it('reads the path, head, branch and lock of each working copy', () => {
		const porcelain = [
			'worktree C:/repo',
			'HEAD 1111111111111111111111111111111111111111',
			'branch refs/heads/main',
			'',
			'worktree C:/repo/.claude/worktrees/agent-a',
			'HEAD 2222222222222222222222222222222222222222',
			'branch refs/heads/feat/a',
			'locked claude agent agent-a (pid 22064)',
			'',
			'worktree C:/repo/.claude/worktrees/agent-b',
			'HEAD 3333333333333333333333333333333333333333',
			'detached',
			'locked',
			''
		].join('\n');

		expect(parseWorktreeList(porcelain)).toEqual([
			{ path: 'C:/repo', head: '1'.repeat(40), branch: 'main', locked: null },
			{
				path: 'C:/repo/.claude/worktrees/agent-a',
				head: '2'.repeat(40),
				branch: 'feat/a',
				locked: 'claude agent agent-a (pid 22064)'
			},
			{ path: 'C:/repo/.claude/worktrees/agent-b', head: '3'.repeat(40), branch: null, locked: '' }
		]);
	});

	it('gives the command that unlocks a copy, with its path quoted', () => {
		expect(unlockCommand('C:\\my repo\\copy')).toBe('git worktree unlock "C:\\my repo\\copy"');
	});
});

describe('clean-worktrees, on a temporary repository', () => {
	let sandbox = '';
	let repo = '';
	const copy = (name: string) => join(repo, '.claude', 'worktrees', name);

	function git(args: string[], cwd = repo): string {
		return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		}).trim();
	}

	function clean(args: string[] = [], cwd = repo): string {
		return execFileSync(process.execPath, [TOOL, ...args], {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		});
	}

	beforeAll(() => {
		sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'dd-worktrees-')));
		repo = join(sandbox, 'repo');
		mkdirSync(repo);
		git(['init', '--quiet', '--initial-branch=main']);
		git(['config', 'user.name', 'Test']);
		git(['config', 'user.email', 'test@example.org']);
		git(['commit', '--quiet', '--allow-empty', '-m', 'first']);
		git(['init', '--quiet', '--bare', join(sandbox, 'origin.git')]);
		git(['remote', 'add', 'origin', join(sandbox, 'origin.git')]);
		git(['push', '--quiet', 'origin', 'main']);

		for (const name of ['merged', 'locked', 'unmerged', 'dirty']) {
			git(['worktree', 'add', '--quiet', '-b', `lot/${name}`, copy(name)]);
		}
		git(['worktree', 'lock', '--reason', 'claude agent (pid 1)', copy('locked')]);
		git(['commit', '--quiet', '--allow-empty', '-m', 'not merged yet'], copy('unmerged'));
		writeFileSync(join(copy('dirty'), 'draft.txt'), 'in progress');
		mkdirSync(copy('empty-stray'));
		mkdirSync(copy('full-stray'));
		writeFileSync(join(copy('full-stray'), 'note.txt'), 'kept');
	}, SLOW);

	afterAll(() => {
		rmSync(sandbox, { recursive: true, force: true, maxRetries: 3 });
	});

	it(
		'lists what it would do and removes nothing without --apply',
		() => {
			const output = clean();

			expect(output).toMatch(/à retirer\s+merged \[lot\/merged\] : déjà dans origin\/main/);
			expect(output).toMatch(/VERROUILLÉE\s+locked \[lot\/locked\].*claude agent \(pid 1\)/);
			expect(output).toContain(unlockCommand(copy('locked')));
			expect(output).toMatch(/GARDÉ\s+unmerged .*pas encore fusionné/);
			expect(output).toMatch(/GARDÉ\s+dirty .*modifications non enregistrées/);
			expect(output).toMatch(/à retirer\s+empty-stray : dossier vide/);
			expect(output).toMatch(/à examiner\s+full-stray/);
			expect(output).toContain('1 copie(s) à retirer : relancer avec --apply.');
			for (const name of ['merged', 'locked', 'unmerged', 'dirty', 'empty-stray', 'full-stray']) {
				expect(existsSync(copy(name)), name).toBe(true);
			}
		},
		SLOW
	);

	it(
		'started from a copy, removes the merged copy and the empty folder, never the locked copy, the main repository nor itself',
		() => {
			const output = clean(['--apply'], copy('unmerged'));

			expect(output).not.toMatch(/\brepo \[main\]/);
			expect(output).not.toMatch(/unmerged \[lot\/unmerged\]/);
			expect(output).toMatch(/retiré\s+merged/);
			expect(output).toMatch(/retiré\s+empty-stray : dossier vide/);
			expect(output).toContain('1 copie(s) retirée(s) sur 1.');
			expect(output).toContain(unlockCommand(copy('locked')));
			expect(existsSync(copy('merged'))).toBe(false);
			expect(existsSync(copy('empty-stray'))).toBe(false);
			for (const name of ['locked', 'unmerged', 'dirty', 'full-stray']) {
				expect(existsSync(copy(name)), name).toBe(true);
			}
			const left = parseWorktreeList(git(['worktree', 'list', '--porcelain']));
			expect(left.find((entry) => entry.path.endsWith('/locked'))?.locked).toBe(
				'claude agent (pid 1)'
			);
			expect(git(['branch', '--list', 'lot/merged'])).toContain('lot/merged');
		},
		SLOW
	);
});
