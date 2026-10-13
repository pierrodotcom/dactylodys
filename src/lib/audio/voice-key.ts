/*
 * FNV-1a on 64 bits: a dozen lines that give the same result in Node and in every browser, without
 * Web Crypto (asynchronous) nor any dependency. It is not cryptographic and need not be: a clash
 * between two of a few hundred sentences is out of reach, and a test checks the shipped ones.
 */
const OFFSET_BASIS = 0xcbf29ce484222325n;
const PRIME = 0x100000001b3n;
const HASH_BITS = 64;
const HEX_RADIX = 16;
const KEY_LENGTH = 16;

export const VOICE_KEY_PATTERN = /^[0-9a-f]{16}$/;

const encoder = new TextEncoder();

/** The name of the clip that says this text: the same for every way of writing the same sentence. */
export function voiceKey(text: string): string {
	let hash = OFFSET_BASIS;
	for (const byte of encoder.encode(text.normalize('NFC').trim())) {
		hash = BigInt.asUintN(HASH_BITS, (hash ^ BigInt(byte)) * PRIME);
	}
	return hash.toString(HEX_RADIX).padStart(KEY_LENGTH, '0');
}
