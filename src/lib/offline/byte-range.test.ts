import { describe, expect, it } from 'vitest';
import { answerRange } from './byte-range';

const BYTES = Uint8Array.from({ length: 10 }, (_, index) => index);

function cached(): Response {
	return new Response(BYTES, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
}

async function bytesOf(response: Response): Promise<number[]> {
	return [...new Uint8Array(await response.arrayBuffer())];
}

describe('answerRange', () => {
	it('gives the cached response itself when no range is asked', async () => {
		const response = cached();
		expect(await answerRange(response, null)).toBe(response);
	});

	it('cuts the piece asked for and says where it comes from', async () => {
		const response = await answerRange(cached(), 'bytes=2-4');
		expect(response.status).toBe(206);
		expect(await bytesOf(response)).toEqual([2, 3, 4]);
		expect(response.headers.get('Content-Range')).toBe('bytes 2-4/10');
		expect(response.headers.get('Content-Length')).toBe('3');
		expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
	});

	it('serves the rest of the file for an open range', async () => {
		expect(await bytesOf(await answerRange(cached(), 'bytes=7-'))).toEqual([7, 8, 9]);
	});

	it('serves the last bytes for a suffix range', async () => {
		expect(await bytesOf(await answerRange(cached(), 'bytes=-2'))).toEqual([8, 9]);
	});

	it('stops at the end of the file when the range goes further', async () => {
		const response = await answerRange(cached(), 'bytes=8-99');
		expect(await bytesOf(response)).toEqual([8, 9]);
		expect(response.headers.get('Content-Range')).toBe('bytes 8-9/10');
	});

	it.each(['bytes=10-', 'bytes=5-2', 'bytes=-', 'items=1-2', 'bytes=a-b'])(
		'answers 416 to the range %s',
		async (range) => {
			const response = await answerRange(cached(), range);
			expect(response.status).toBe(416);
			expect(response.headers.get('Content-Range')).toBe('bytes */10');
		}
	);
});
