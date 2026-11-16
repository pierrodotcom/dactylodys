import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	copyIdentity,
	markFileName,
	PORT_RANGE,
	preferredPort,
	siteMark,
	SITE_OUTPUT,
	writeSiteMark
} from '../../tools/lib/e2e-site.js';

// Two copies of the repository side by side, as the agents make them (L-149).
const FIRST_COPY = 'C:/Projets/DactyloDys/.claude/worktrees/agent-a1';
const SECOND_COPY = 'C:/Projets/DactyloDys/.claude/worktrees/agent-b2';
const MAIN_COPY = 'C:/Projets/DactyloDys';

describe('the site of the end-to-end tests of a copy', () => {
	const made: string[] = [];
	afterEach(() => {
		for (const directory of made.splice(0)) rmSync(directory, { recursive: true, force: true });
	});

	function newCopy(): string {
		const directory = mkdtempSync(join(tmpdir(), 'dactylodys-copy-'));
		made.push(directory);
		return directory;
	}

	it('asks for the same port at every run of a copy, within the range of the copies', () => {
		const port = preferredPort(FIRST_COPY);

		expect(preferredPort(FIRST_COPY)).toBe(port);
		expect(port).toBeGreaterThanOrEqual(PORT_RANGE.first);
		expect(port).toBeLessThan(PORT_RANGE.first + PORT_RANGE.size);
	});

	it('asks two copies for two ports, and gives them two marks', () => {
		const copies = [FIRST_COPY, SECOND_COPY, MAIN_COPY];

		expect(new Set(copies.map((copy) => preferredPort(copy))).size).toBe(copies.length);
		expect(new Set(copies.map((copy) => siteMark(copy))).size).toBe(copies.length);
	});

	it('takes the path of a copy written with another case or other slashes for the same copy on Windows', () => {
		const written = 'C:\\Projets\\DactyloDys\\.claude\\worktrees\\agent-a1';

		expect(copyIdentity(written, 'win32')).toBe(copyIdentity(FIRST_COPY.toLowerCase(), 'win32'));
		expect(siteMark(written, 'win32')).toBe(siteMark(FIRST_COPY, 'win32'));
		expect(preferredPort(written, 'win32')).toBe(preferredPort(FIRST_COPY, 'win32'));
	});

	it('writes in the built site of a copy the mark it waits for, never the mark of another copy', () => {
		const copy = newCopy();
		const other = newCopy();

		const file = writeSiteMark(copy);

		expect(file).toBe(join(copy, SITE_OUTPUT, markFileName(siteMark(copy))));
		expect(readFileSync(file, 'utf8').trim()).toBe(siteMark(copy));
		expect(existsSync(join(copy, SITE_OUTPUT, markFileName(siteMark(other))))).toBe(false);
	});
});
