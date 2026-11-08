import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isElidedBefore } from './elision';

const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;
const ELIDED_SUFFIX = '_elided';

describe('isElidedBefore', () => {
	it.each(['Ali', 'alex', 'Élio', 'Inès', 'Owen', 'Ugo', 'Hugo', 'Œlie', '  Emma'])(
		'elides before %s',
		(name) => {
			expect(isElidedBefore(name)).toBe(true);
		}
	);

	it.each(['Lou', 'Yanis', 'Zoé', '007', '', ' '])('does not elide before %j', (name) => {
		expect(isElidedBefore(name)).toBe(false);
	});
});

describe('elided messages', () => {
	const elidedKeys = Object.keys(messages).filter((key) => key.endsWith(ELIDED_SUFFIX));

	it('exist', () => {
		expect(elidedKeys.length).toBeGreaterThan(0);
	});

	it.each(elidedKeys)('%s is its plain message with « de » elided before the name', (key) => {
		const plain = messages[key.slice(0, -ELIDED_SUFFIX.length)];
		expect(plain).toContain('de {name}');
		expect(messages[key]).toBe(plain?.replace('de {name}', "d'{name}"));
	});

	it('cover every plain message with « de » before the name', () => {
		const needing = Object.keys(messages).filter(
			(key) => !key.endsWith(ELIDED_SUFFIX) && messages[key]?.includes('de {name}')
		);
		expect(needing.map((key) => `${key}${ELIDED_SUFFIX}`).sort()).toEqual([...elidedKeys].sort());
	});
});
