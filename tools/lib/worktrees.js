/**
 * @typedef {object} Worktree
 * @property {string} path
 * @property {string} head
 * @property {string | null} branch  `null` when the head is detached
 * @property {string | null} locked  the reason given when it was locked (may be empty), or `null`
 */

/**
 * Reads `git worktree list --porcelain`: one block per working copy, the main one first.
 *
 * @param {string} porcelain
 * @returns {Worktree[]}
 */
export function parseWorktreeList(porcelain) {
	/** @type {Worktree[]} */
	const entries = [];
	/** @type {Worktree | undefined} */
	let current;
	for (const line of porcelain.split(/\r?\n/)) {
		if (line.startsWith('worktree ')) {
			current = { path: line.slice('worktree '.length), head: '', branch: null, locked: null };
			entries.push(current);
		} else if (!current) continue;
		else if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length);
		else if (line.startsWith('branch ')) current.branch = line.slice('branch refs/heads/'.length);
		else if (line === 'locked') current.locked = '';
		else if (line.startsWith('locked ')) current.locked = line.slice('locked '.length);
	}
	return entries;
}

/**
 * What to type to free a locked working copy. The tool only prints it: a lock means that a session
 * may still be using the copy, and only a person can tell that it is not.
 *
 * @param {string} path
 */
export function unlockCommand(path) {
	return `git worktree unlock "${path}"`;
}
