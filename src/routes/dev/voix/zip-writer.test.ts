import { crc32 as nodeCrc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { readZipEntry } from '$lib/audio/zip-test-support';
import { crc32, writeZip } from './zip-writer';

const WRITTEN_AT = new Date('2026-10-14T09:30:58Z');
const encoder = new TextEncoder();

function bytes(length: number, seed: number): Uint8Array {
	return Uint8Array.from({ length }, (_, index) => (index * 31 + seed) % 256);
}

describe('crc32', () => {
	it('gives the reference value of the standard check string', () => {
		expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926);
	});

	it('agrees with the checksum of Node on arbitrary bytes', () => {
		const data = bytes(5000, 7);

		expect(crc32(data)).toBe(nodeCrc32(data));
		expect(crc32(new Uint8Array(0))).toBe(0);
	});
});

describe('writeZip', () => {
	it('writes an archive that the zip reader of the project reads back, byte for byte', async () => {
		const audio = bytes(70_000, 3);
		const index = encoder.encode('{"clips":[]}\n');

		const archive = writeZip(
			[
				{ name: 'af63dc4c8601ec8c.wav', data: audio },
				{ name: 'enregistrements.json', data: index }
			],
			WRITTEN_AT
		);

		expect(await readZipEntry(archive, 'af63dc4c8601ec8c.wav')).toEqual(audio);
		expect(await readZipEntry(archive, 'enregistrements.json')).toEqual(index);
	});

	it('stores the entries without compressing them', () => {
		const data = new Uint8Array(10_000);

		const archive = writeZip([{ name: 'silence.wav', data }], WRITTEN_AT);

		expect(archive.length).toBeGreaterThan(data.length);
	});

	it('keeps accented names and empty files', async () => {
		const archive = writeZip(
			[
				{ name: 'voix/été.txt', data: encoder.encode('chaud') },
				{ name: 'vide.txt', data: new Uint8Array(0) }
			],
			WRITTEN_AT
		);

		expect(new TextDecoder().decode(await readZipEntry(archive, 'voix/été.txt'))).toBe('chaud');
		expect(await readZipEntry(archive, 'vide.txt')).toHaveLength(0);
	});

	it('writes a valid archive without any entry', async () => {
		const archive = writeZip([], WRITTEN_AT);

		expect(archive).toHaveLength(22);
		await expect(readZipEntry(archive, 'absent.txt')).rejects.toThrow('not found');
	});

	it('gives the same bytes for the same entries and the same date', () => {
		const entries = [{ name: 'a.txt', data: encoder.encode('a') }];

		expect(writeZip(entries, WRITTEN_AT)).toEqual(writeZip(entries, WRITTEN_AT));
		expect(writeZip(entries, WRITTEN_AT)).not.toEqual(
			writeZip(entries, new Date('2027-01-01T00:00:00Z'))
		);
	});

	it('writes the date of the entries in the format of ZIP', () => {
		const archive = writeZip([{ name: 'a.txt', data: encoder.encode('a') }], WRITTEN_AT);
		const view = new DataView(archive.buffer);

		const time = view.getUint16(10, true);
		const date = view.getUint16(12, true);
		expect([(date >> 9) + 1980, (date >> 5) & 15, date & 31]).toEqual([2026, 10, 14]);
		expect([time >> 11, (time >> 5) & 63, (time & 31) * 2]).toEqual([9, 30, 58]);
	});

	it.each([
		['an empty name', ''],
		['an absolute path', '/etc/a.txt'],
		['a Windows path', 'voix\\a.txt']
	])('refuses %s', (_, name) => {
		expect(() => writeZip([{ name, data: new Uint8Array(1) }], WRITTEN_AT)).toThrow(
			'Invalid zip entry name'
		);
	});

	it('refuses two entries of the same name', () => {
		const entry = { name: 'a.txt', data: new Uint8Array(1) };

		expect(() => writeZip([entry, entry], WRITTEN_AT)).toThrow('Duplicate zip entry name');
	});
});
