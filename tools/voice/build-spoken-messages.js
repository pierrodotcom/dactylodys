import { mkdir, readFile, writeFile } from 'node:fs/promises';

/*
 * The messages the voice says (`SPOKEN_MESSAGE_GROUPS`), and only them, for `/dev/voix`: the page
 * is published (ADR-078), and importing the whole `messages/fr.json` there put the texts of the
 * internal trial pages in the published code (`e2e/published.spec.ts`).
 */
const { SPOKEN_MESSAGE_GROUPS } = await import('../../src/lib/audio/voice-messages.ts');

const OUTPUT_DIRECTORY = 'src/lib/generated';
const OUTPUT = `${OUTPUT_DIRECTORY}/spoken-messages.fr.json`;

/** @type {Record<string, string>} */
const messages = JSON.parse(await readFile('messages/fr.json', 'utf8'));

/** @param {string} key */
function isSpoken(key) {
	return SPOKEN_MESSAGE_GROUPS.some((group) =>
		group.keys.some((pattern) =>
			typeof pattern === 'string' ? pattern === key : pattern.test(key)
		)
	);
}

const spoken = Object.fromEntries(Object.entries(messages).filter(([key]) => isSpoken(key)));

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(spoken, null, '\t')}\n`);
