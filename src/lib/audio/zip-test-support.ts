import { Buffer } from 'node:buffer';

/*
 * For tests only: reads an archive with the zip reader of the content tools, the one the import
 * tool of the voice uses. It is loaded by its address because that file is plain JavaScript
 * without types, which a static import would drag into the type check of the app.
 */
const READER_URL = new URL('../../../tools/content/lib/zip.js', import.meta.url).href;

type ReadZipEntry = (archive: Buffer, entryName: string) => Buffer;

let reader: Promise<ReadZipEntry> | undefined;

/** The bytes of one entry of the archive; rejects when the entry is not there. */
export async function readZipEntry(archive: Uint8Array, entryName: string): Promise<Uint8Array> {
	reader ??= import(/* @vite-ignore */ READER_URL).then(
		(module: { readZipEntry: ReadZipEntry }) => module.readZipEntry
	);
	return new Uint8Array((await reader)(Buffer.from(archive), entryName));
}
