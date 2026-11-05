/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { base, build, files, prerendered, version } from '$service-worker';
import { answerRange } from '$lib/offline/byte-range';
import {
	cacheName,
	homeCandidates,
	pageCandidates,
	precacheUrls,
	staleCaches
} from '$lib/offline/cache-plan';

/*
 * The whole game is kept at the first visit, then served from that copy (ADR-054).
 *
 * A new version never reaches a game in progress: there is no `skipWaiting()`, no `clients.claim()`
 * when a version replaces another, and the page never asks for a reload. The new worker installs
 * into its own cache, then waits until every tab of the old version is closed; the old cache stays
 * in place until then, so a page that is open keeps all its files. The next opening gets the new
 * version, whole.
 */

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = cacheName(version);
/** In development `build` is empty and files change all the time: the worker stays out of the way. */
const SERVING = build.length > 0;
/** The first worker of a site may take the page that installed it; a replacement never takes one. */
const FIRST_INSTALL = sw.registration.active === null;

sw.addEventListener('install', (event) => {
	if (!SERVING) return;
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			// `reload`: ask the network, not the HTTP cache, which may still hold the previous version.
			const { required, optional } = precacheUrls({ build, files, prerendered, base });
			const fresh = (url: string) => new Request(url, { cache: 'reload' });
			await cache.addAll(required.map(fresh));
			await Promise.allSettled(optional.map((url) => cache.add(fresh(url))));
		})()
	);
});

sw.addEventListener('activate', (event) => {
	if (!SERVING) return;
	event.waitUntil(
		(async () => {
			for (const name of staleCaches(await caches.keys(), CACHE)) await caches.delete(name);
			if (FIRST_INSTALL) await sw.clients.claim();
		})()
	);
});

async function firstCached(cache: Cache, paths: readonly string[]): Promise<Response | undefined> {
	for (const path of paths) {
		const found = await cache.match(path);
		if (found) return found;
	}
	return undefined;
}

async function answer(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const { pathname } = new URL(request.url);

	if (request.mode === 'navigate') {
		const page = await firstCached(cache, pageCandidates(pathname));
		// A page kept after a redirect (a host that adds a slash) cannot answer a navigation as it is.
		if (page) return page.redirected ? new Response(page.body, page) : page;
		try {
			return await fetch(request);
		} catch {
			const home = await firstCached(cache, homeCandidates(base));
			return home ?? Response.error();
		}
	}

	const kept = await cache.match(pathname);
	if (kept) return answerRange(kept, request.headers.get('Range'));
	return fetch(request);
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (!SERVING || request.method !== 'GET') return;
	if (new URL(request.url).origin !== sw.location.origin) return;
	event.respondWith(answer(request));
});
