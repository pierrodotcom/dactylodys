import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE_DIR, CONFIG, ensureDir, parseArgs } from './lib/common.js';
import { LEXIQUE_DIR, WIKTIONARY_DIR, allCategories, wiktionaryCachePath } from './lib/sources.js';
import { readZipEntry } from './lib/zip.js';

const USER_AGENT =
	'DactyloDys-content-tools/0.1 (open-source typing game; contact via the repository)';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function callApi(params) {
	const url = new URL(CONFIG.sources.wiktionary.apiUrl);
	for (const [key, value] of Object.entries({ ...params, format: 'json', formatversion: 2 })) {
		url.searchParams.set(key, value);
	}
	for (let attempt = 1; ; attempt++) {
		try {
			const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
			if (response.status === 429 && attempt < 8) {
				const wait = Number(response.headers.get('retry-after')) || 30;
				await sleep((wait + 5) * 1000);
				continue;
			}
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return await response.json();
		} catch (error) {
			if (attempt === 8) throw error;
			await sleep(5000 * attempt);
		}
	}
}

async function listMembers(category, depth, seen) {
	if (seen.has(category)) return [];
	seen.add(category);
	const titles = [];
	let more = {};
	while (more) {
		const answer = await callApi({
			action: 'query',
			list: 'categorymembers',
			cmtitle: `Catégorie:${category}`,
			cmlimit: 500,
			cmtype: 'page|subcat',
			...more
		});
		for (const member of answer.query?.categorymembers ?? []) {
			if (member.ns === 0) titles.push(member.title);
			else if (member.ns === 14 && depth > 0) {
				const sub = member.title.replace(/^[^:]+:/, '');
				titles.push(...(await listMembers(sub, depth - 1, seen)));
			}
		}
		more = answer.continue ?? null;
		await sleep(CONFIG.sources.wiktionary.requestDelayMs);
	}
	return titles;
}

async function fetchLexique(args) {
	const archive = join(LEXIQUE_DIR, CONFIG.sources.lexique.archiveName);
	const table = join(LEXIQUE_DIR, CONFIG.sources.lexique.tableName);
	ensureDir(LEXIQUE_DIR);
	if (typeof args['lexique-zip'] === 'string') copyFileSync(args['lexique-zip'], archive);
	if (!existsSync(archive)) {
		console.log(`Downloading ${CONFIG.sources.lexique.archiveUrl}`);
		const response = await fetch(CONFIG.sources.lexique.archiveUrl, {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (!response.ok) throw new Error(`Lexique download failed: HTTP ${response.status}`);
		writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
	}
	if (args.refresh || !existsSync(table)) {
		writeFileSync(table, readZipEntry(readFileSync(archive), CONFIG.sources.lexique.tableName));
	}
	console.log(`Lexique ready: ${table}`);
}

async function fetchWiktionary(args) {
	ensureDir(WIKTIONARY_DIR);
	const names = allCategories();
	for (const [i, category] of names.entries()) {
		const path = wiktionaryCachePath(category);
		if (!args.refresh && existsSync(path)) continue;
		const titles = await listMembers(
			category,
			CONFIG.sources.wiktionary.subcategoryDepth,
			new Set()
		);
		const entry = { category, fetchedAt: new Date().toISOString().slice(0, 10), titles };
		writeFileSync(path, JSON.stringify(entry), 'utf8');
		console.log(`[${i + 1}/${names.length}] ${category}: ${titles.length} pages`);
	}
}

const args = parseArgs(process.argv.slice(2));
await fetchLexique(args);
await fetchWiktionary(args);
console.log('Sources ready in', CACHE_DIR);
