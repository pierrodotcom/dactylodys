const TEXT_ATTRIBUTES = new Set([
	'alt',
	'title',
	'placeholder',
	'aria-label',
	'aria-description',
	'aria-placeholder',
	'aria-roledescription',
	'aria-valuetext'
]);

const HAS_LETTER = /\p{L}/u;

/** @param {any} node */
function stringsIn(node) {
	switch (node?.type) {
		case 'Literal':
			return typeof node.value === 'string' ? [node.value] : [];
		case 'TemplateLiteral':
			return node.quasis.map((/** @type {any} */ quasi) => quasi.value.cooked ?? '');
		case 'ConditionalExpression':
			return [...stringsIn(node.consequent), ...stringsIn(node.alternate)];
		case 'LogicalExpression':
			return [...stringsIn(node.left), ...stringsIn(node.right)];
		default:
			return [];
	}
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: { description: 'Disallow visible text written directly in Svelte templates.' },
		schema: [],
		messages: {
			text: 'Hard-coded text is forbidden: use a message from messages/ ({{ text }}).',
			attribute: 'Hard-coded "{{ name }}" attribute is forbidden: use a message from messages/.',
			expression:
				'Hard-coded string in a template expression is forbidden: use a message from messages/.'
		}
	},
	create(context) {
		/** @param {any} node */
		const report = (node, messageId, data = {}) => context.report({ node, messageId, data });

		return {
			/** @param {any} node */
			SvelteText(node) {
				const parentType = node.parent?.type;
				if (parentType === 'SvelteStyleElement' || parentType === 'SvelteScriptElement') return;
				if (HAS_LETTER.test(node.value)) {
					report(node, 'text', { text: JSON.stringify(node.value.trim().slice(0, 30)) });
				}
			},
			/** @param {any} node */
			SvelteAttribute(node) {
				const name = String(node.key?.name ?? '').toLowerCase();
				if (!TEXT_ATTRIBUTES.has(name)) return;
				const literal = node.value.some(
					(/** @type {any} */ part) => part.type === 'SvelteLiteral' && HAS_LETTER.test(part.value)
				);
				if (literal) report(node, 'attribute', { name });
			},
			/** @param {any} node */
			SvelteMustacheTag(node) {
				if (node.kind !== 'text') return;
				const parent = node.parent;
				if (parent?.type === 'SvelteAttribute') {
					if (!TEXT_ATTRIBUTES.has(String(parent.key?.name ?? '').toLowerCase())) return;
				} else if (parent?.type === 'SvelteStyleDirective') {
					return;
				}
				if (stringsIn(node.expression).some((value) => HAS_LETTER.test(value))) {
					report(node, 'expression');
				}
			}
		};
	}
};
