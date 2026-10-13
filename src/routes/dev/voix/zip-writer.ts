/*
 * Writes a ZIP archive whose entries are stored as they are: audio does not shrink enough to be
 * worth a compressor in the page. Same format as `tools/content/lib/zip.js` reads.
 */

export interface ZipEntry {
	/** Path in the archive, with `/` between folders. */
	readonly name: string;
	readonly data: Uint8Array;
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const END_BYTES = 22;
/** Version 2.0 of the format: the lowest that every reader knows. */
const ZIP_VERSION = 20;
/** Bit 11: names are UTF-8. */
const UTF8_NAMES = 0x0800;
const METHOD_STORED = 0;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;
const DOS_EPOCH_YEAR = 1980;
const DOS_LAST_YEAR = 2107;
const CRC_POLYNOMIAL = 0xedb88320;

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit++) {
		value = value & 1 ? (value >>> 1) ^ CRC_POLYNOMIAL : value >>> 1;
	}
	return value >>> 0;
});

export function crc32(data: Uint8Array): number {
	let crc = MAX_UINT32;
	for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	return (crc ^ MAX_UINT32) >>> 0;
}

/** Date and time as ZIP stores them (two seconds apart at best), read in UTC to stay reproducible. */
function dosDateTime(date: Date): { date: number; time: number } {
	const year = Math.min(DOS_LAST_YEAR, Math.max(DOS_EPOCH_YEAR, date.getUTCFullYear()));
	return {
		date: ((year - DOS_EPOCH_YEAR) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
		time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1)
	};
}

function checkEntries(entries: readonly ZipEntry[], names: readonly Uint8Array[]) {
	if (entries.length > MAX_UINT16) throw new Error('Too many files for a zip archive');
	const seen = new Set<string>();
	entries.forEach((entry, index) => {
		if (entry.name === '' || entry.name.startsWith('/') || entry.name.includes('\\')) {
			throw new Error(`Invalid zip entry name "${entry.name}"`);
		}
		if (seen.has(entry.name)) throw new Error(`Duplicate zip entry name "${entry.name}"`);
		seen.add(entry.name);
		if ((names[index]?.length ?? 0) > MAX_UINT16) {
			throw new Error(`Zip entry name too long: "${entry.name}"`);
		}
	});
}

export function writeZip(entries: readonly ZipEntry[], modifiedAt: Date): Uint8Array<ArrayBuffer> {
	const encoder = new TextEncoder();
	const names = entries.map((entry) => encoder.encode(entry.name));
	checkEntries(entries, names);

	const localBytes = entries.reduce(
		(total, entry, index) =>
			total + LOCAL_HEADER_BYTES + (names[index]?.length ?? 0) + entry.data.length,
		0
	);
	const centralBytes = names.reduce((total, name) => total + CENTRAL_HEADER_BYTES + name.length, 0);
	const totalBytes = localBytes + centralBytes + END_BYTES;
	// Beyond these sizes the format needs its 64-bit extension, which this writer does not have.
	if (totalBytes > MAX_UINT32) throw new Error('Too much data for a zip archive');

	const archive = new Uint8Array(totalBytes);
	const view = new DataView(archive.buffer);
	const stamp = dosDateTime(modifiedAt);
	let offset = 0;
	let centralOffset = localBytes;

	entries.forEach((entry, index) => {
		const name = names[index] ?? new Uint8Array(0);
		const checksum = crc32(entry.data);
		const localOffset = offset;

		/** The fields that the local and the central headers share, in the same order. */
		const writeCommon = (at: number) => {
			view.setUint16(at, ZIP_VERSION, true);
			view.setUint16(at + 2, UTF8_NAMES, true);
			view.setUint16(at + 4, METHOD_STORED, true);
			view.setUint16(at + 6, stamp.time, true);
			view.setUint16(at + 8, stamp.date, true);
			view.setUint32(at + 10, checksum, true);
			view.setUint32(at + 14, entry.data.length, true);
			view.setUint32(at + 18, entry.data.length, true);
			view.setUint16(at + 22, name.length, true);
		};

		view.setUint32(offset, LOCAL_FILE_HEADER, true);
		writeCommon(offset + 4);
		archive.set(name, offset + LOCAL_HEADER_BYTES);
		archive.set(entry.data, offset + LOCAL_HEADER_BYTES + name.length);
		offset += LOCAL_HEADER_BYTES + name.length + entry.data.length;

		view.setUint32(centralOffset, CENTRAL_FILE_HEADER, true);
		view.setUint16(centralOffset + 4, ZIP_VERSION, true);
		writeCommon(centralOffset + 6);
		view.setUint32(centralOffset + 42, localOffset, true);
		archive.set(name, centralOffset + CENTRAL_HEADER_BYTES);
		centralOffset += CENTRAL_HEADER_BYTES + name.length;
	});

	view.setUint32(centralOffset, END_OF_CENTRAL_DIRECTORY, true);
	view.setUint16(centralOffset + 8, entries.length, true);
	view.setUint16(centralOffset + 10, entries.length, true);
	view.setUint32(centralOffset + 12, centralBytes, true);
	view.setUint32(centralOffset + 16, localBytes, true);
	return archive;
}
