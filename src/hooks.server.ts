import type { Handle } from '@sveltejs/kit';
import { getLocale } from '$lib/paraglide/runtime.js';

export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', getLocale())
	});
