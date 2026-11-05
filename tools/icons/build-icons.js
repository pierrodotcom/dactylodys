import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { buildIconSvg } from './icon-svg.js';

process.chdir(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = 'static/icons';
const config = JSON.parse(await readFile('tools/icons/config.json', 'utf8'));
const tokens = JSON.parse(await readFile('src/lib/generated/token-values.json', 'utf8'));
const SAVE_SVG = process.argv.includes('--svg');

/**
 * Runs in the page: takes the companion as the app draws it, at the size it will have in the icon,
 * and writes what the style sheet gives to each shape as attributes, so that the markup stands
 * alone. Strokes that do not scale with the drawing (`non-scaling-stroke`) are given back in the
 * units of the view box.
 *
 * @param {{ pixelsPerUnit: number }} options
 */
function extractCompanion({ pixelsPerUnit }) {
	const svg = document.querySelector('svg.companion');
	if (!svg) throw new Error('No companion on the page');
	const PROPERTIES = [
		'fill',
		'fill-opacity',
		'stroke',
		'stroke-width',
		'stroke-linejoin',
		'stroke-linecap',
		'opacity'
	];
	const clone = /** @type {SVGElement} */ (svg.cloneNode(true));
	const sources = [svg, ...svg.querySelectorAll('*')];
	const copies = [clone, ...clone.querySelectorAll('*')];
	sources.forEach((source, index) => {
		const copy = /** @type {Element} */ (copies[index]);
		const inClip = source.closest('clipPath') !== null;
		if (!inClip) {
			const style = getComputedStyle(source);
			const fixed = style.getPropertyValue('vector-effect') === 'non-scaling-stroke';
			for (const property of PROPERTIES) {
				let value = style.getPropertyValue(property);
				if (property === 'stroke-width' && fixed) {
					value = String(Math.round((parseFloat(value) / pixelsPerUnit) * 1000) / 1000);
				}
				if (value) copy.setAttribute(property, value);
			}
		}
		copy.removeAttribute('class');
		copy.removeAttribute('style');
		copy.removeAttribute('vector-effect');
	});
	return clone.innerHTML;
}

/** The companion of the app in its default colour, calm, with nothing worn, in the light theme. */
async function readCompanion(browser, origin) {
	const { companion } = config;
	const side = companion.viewBox * companion.scale;
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	await page.goto(`${origin}${companion.page}`);
	await page.locator('svg.companion').first().waitFor();
	await page.evaluate(
		({ side }) => {
			const root = document.documentElement;
			root.dataset['theme'] = 'light';
			root.dataset['motion'] = 'reduced';
			const svg = document.querySelector('svg.companion');
			if (!svg) return;
			// The default colour is the one with no `data-color`; nothing worn.
			svg.removeAttribute('data-color');
			svg.removeAttribute('data-items');
			svg.style.width = `${side}px`;
			svg.style.height = `${side}px`;
			const stop = document.createElement('style');
			stop.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
			document.head.append(stop);
		},
		{ side }
	);
	const mood = await page.locator('svg.companion').first().getAttribute('data-mood');
	if (mood !== 'idle') throw new Error(`Expected the calm companion, got "${mood}"`);
	const markup = await page.evaluate(extractCompanion, { pixelsPerUnit: companion.scale });
	await page.close();
	return markup;
}

async function renderPng(browser, svg, size) {
	const page = await browser.newPage({ viewport: { width: size, height: size } });
	await page.setContent(
		`<!doctype html><body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body>`
	);
	const png = await page.screenshot({
		type: 'png',
		clip: { x: 0, y: 0, width: size, height: size }
	});
	await page.close();
	return png;
}

const server = await createServer({
	server: { port: config.devServerPort, strictPort: true, host: '127.0.0.1' },
	logLevel: 'error'
});
await server.listen();
const browser = await chromium.launch();
try {
	const origin = `http://127.0.0.1:${config.devServerPort}`;
	const companion = await readCompanion(browser, origin);
	await mkdir(OUT_DIR, { recursive: true });
	for (const output of config.outputs) {
		const svg = buildIconSvg({ config, tokens, companion, maskable: output.maskable });
		await writeFile(`${OUT_DIR}/${output.file}`, await renderPng(browser, svg, output.size));
		if (SAVE_SVG) await writeFile(`${OUT_DIR}/${output.file.replace(/\.png$/, '.svg')}`, svg);
		console.log(`${OUT_DIR}/${output.file}`);
	}
} finally {
	await browser.close();
	await server.close();
}
