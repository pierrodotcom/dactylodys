import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

/** Extracts one entry from a zip archive held in memory (stored or deflated entries only). */
export function readZipEntry(archive, entryName) {
	let end = archive.length - 22;
	while (end >= 0 && archive.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) end--;
	if (end < 0) throw new Error('Not a zip archive');
	const entryCount = archive.readUInt16LE(end + 10);
	let offset = archive.readUInt32LE(end + 16);
	for (let i = 0; i < entryCount; i++) {
		if (archive.readUInt32LE(offset) !== CENTRAL_FILE_HEADER) throw new Error('Corrupt zip');
		const method = archive.readUInt16LE(offset + 10);
		const compressedSize = archive.readUInt32LE(offset + 20);
		const nameLength = archive.readUInt16LE(offset + 28);
		const extraLength = archive.readUInt16LE(offset + 30);
		const commentLength = archive.readUInt16LE(offset + 32);
		const localOffset = archive.readUInt32LE(offset + 42);
		const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength);
		if (name === entryName) {
			if (archive.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) throw new Error('Corrupt zip');
			const localName = archive.readUInt16LE(localOffset + 26);
			const localExtra = archive.readUInt16LE(localOffset + 28);
			const start = localOffset + 30 + localName + localExtra;
			const data = archive.subarray(start, start + compressedSize);
			if (method === 0) return Buffer.from(data);
			if (method === 8) return inflateRawSync(data);
			throw new Error(`Unsupported zip method ${method}`);
		}
		offset += 46 + nameLength + extraLength + commentLength;
	}
	throw new Error(`Entry ${entryName} not found in archive`);
}
