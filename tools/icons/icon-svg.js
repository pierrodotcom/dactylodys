/**
 * Pure construction of the icon: no browser, no file. `companion` is the markup of the real
 * companion (see `build-icons.js`), already expressed in the units of its 120 x 120 view box.
 */

/**
 * @param {{ light: Record<string, string>, dark: Record<string, string> }} tokens
 * @param {string} reference `dark.color-surface-base`: the theme, then the name of the token
 */
export function tokenColor(tokens, reference) {
	const [theme, name] = reference.split('.');
	const value = tokens[/** @type {'light' | 'dark'} */ (theme)]?.[name ?? ''];
	if (!value) throw new Error(`Unknown token reference: ${reference}`);
	return value;
}

/**
 * @param {{ x: number, y: number, width: number, height: number, radius: number }} r
 * @param {string} attributes
 */
function rect(r, attributes) {
	return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius}" ${attributes}/>`;
}

/**
 * @param {{
 *   config: any,
 *   tokens: { light: Record<string, string>, dark: Record<string, string> },
 *   companion: string,
 *   maskable: boolean
 * }} input
 */
export function buildIconSvg({ config, tokens, companion, maskable }) {
	const variant = config.variants[config.variant];
	if (!variant) throw new Error(`Unknown icon variant: ${config.variant}`);
	const color = (/** @type {string} */ reference) => tokenColor(tokens, reference);
	const line = color(config.line);
	const { side, face, homeMark } = config.key;
	const { x, y, scale } = config.companion;
	const size = config.canvas;

	const drawing = [
		rect(side, `fill="${color(variant.keySide)}" stroke="${line}" stroke-width="${side.stroke}"`),
		rect(face, `fill="${color(variant.keyFace)}" stroke="${line}" stroke-width="${face.stroke}"`),
		rect(homeMark, `fill="${line}" fill-opacity="${config.homeMarkOpacity}"`),
		`<g transform="translate(${x} ${y}) scale(${scale})">${companion}</g>`
	].join('\n\t');

	let placed = drawing;
	if (maskable) {
		// Every platform cuts the icon with its own shape: what matters stays inside a circle.
		const { content, safeRadius } = config.maskable;
		const halfWidth = (content.right - content.left) / 2;
		const halfHeight = (content.bottom - content.top) / 2;
		const fit = (safeRadius * size) / Math.hypot(halfWidth, halfHeight);
		const centerX = (content.left + content.right) / 2;
		const centerY = (content.top + content.bottom) / 2;
		const round = (/** @type {number} */ n) => Math.round(n * 1000) / 1000;
		placed = `<g transform="translate(${size / 2} ${size / 2}) scale(${round(fit)}) translate(${-centerX} ${-centerY})">\n\t${drawing}\n\t</g>`;
	}

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
		`\t<rect width="${size}" height="${size}" fill="${color(variant.background)}"/>`,
		`\t${placed}`,
		'</svg>'
	].join('\n');
}
