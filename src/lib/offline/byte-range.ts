const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

/**
 * Browsers ask for sounds by pieces (`Range`). A file kept in a cache is a whole response: Safari
 * refuses it for a media element, so the piece asked for is cut out of it here. A request with no
 * range gets the cached response itself.
 */
export async function answerRange(cached: Response, range: string | null): Promise<Response> {
	if (range === null) return cached;
	const match = RANGE_PATTERN.exec(range.trim());
	const body = await cached.arrayBuffer();
	const total = body.byteLength;
	const unsatisfiable = () =>
		new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
	if (!match) return unsatisfiable();

	const [, from = '', to = ''] = match;
	let start: number;
	let end: number;
	if (from === '') {
		if (to === '') return unsatisfiable();
		start = Math.max(total - Number(to), 0);
		end = total - 1;
	} else {
		start = Number(from);
		end = to === '' ? total - 1 : Math.min(Number(to), total - 1);
	}
	if (start >= total || start > end) return unsatisfiable();

	const headers = new Headers();
	const type = cached.headers.get('Content-Type');
	if (type !== null) headers.set('Content-Type', type);
	headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
	headers.set('Content-Length', String(end - start + 1));
	headers.set('Accept-Ranges', 'bytes');
	return new Response(body.slice(start, end + 1), { status: 206, headers });
}
