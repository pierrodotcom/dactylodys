const TOKEN_PROPERTIES = [
	'/color$/',
	'fill',
	'stroke',
	'/^background/',
	'/^border(-(top|right|bottom|left|block|inline))*-width$/',
	'/^border(-top|-right|-bottom|-left|-block|-inline)?$/',
	'/radius$/',
	'/^outline-(width|color|offset)$/',
	'outline',
	'font',
	'font-family',
	'font-size',
	'font-weight',
	'line-height',
	'letter-spacing',
	'word-spacing',
	'/^margin/',
	'/^padding/',
	'/^(row-|column-)?gap$/',
	'/^(inset|top|right|bottom|left)(-block|-inline)?(-start|-end)?$/',
	'/^(min-|max-)?(width|height|inline-size|block-size)$/',
	'box-shadow',
	'text-shadow',
	'opacity',
	'z-index',
	'transition',
	'transition-duration',
	'transition-delay',
	'transition-timing-function',
	'animation',
	'animation-duration',
	'animation-delay',
	'animation-timing-function'
];

const ALLOWED_KEYWORDS = [
	'inherit',
	'initial',
	'unset',
	'transparent',
	'currentColor',
	'none',
	'auto',
	'0',
	'100%',
	String.raw`/^calc\((var\(--dd-[a-z0-9-]+\)|[-+*/]|[0-9]*\.?[0-9]+|\s)+\)$/`
];

/** @type {import('stylelint').Config} */
export default {
	plugins: ['stylelint-declaration-strict-value'],
	ignoreFiles: [
		'src/lib/generated/**',
		'src/lib/paraglide/**',
		'build/**',
		'.svelte-kit/**',
		'playwright-report/**',
		'test-results/**'
	],
	overrides: [{ files: ['**/*.svelte'], customSyntax: 'postcss-html' }],
	rules: {
		'color-no-hex': true,
		'color-named': 'never',
		'function-disallowed-list': [
			'rgb',
			'rgba',
			'hsl',
			'hsla',
			'hwb',
			'lab',
			'lch',
			'oklab',
			'oklch',
			'color'
		],
		'custom-property-pattern': ['^dd-', { message: 'Custom properties must start with "dd-".' }],
		'declaration-property-value-disallowed-list': [
			{ '/.*/': ['/var\\(\\s*--(?!dd-)/', '/var\\([^)]*,/'] },
			{ message: 'Only var(--dd-…) without fallback is allowed.' }
		],
		'declaration-property-value-allowed-list': [
			{ '/^--/': [String.raw`/^var\(--dd-[a-z0-9-]+\)$/`, 'inherit', 'initial', 'unset'] },
			{ message: 'Custom properties may only alias another token: var(--dd-…).' }
		],
		'scale-unlimited/declaration-strict-value': [
			TOKEN_PROPERTIES,
			{
				ignoreValues: ALLOWED_KEYWORDS,
				ignoreFunctions: false,
				disableFix: true,
				message: 'Use a design token: var(--dd-…) (found "${value}" for "${property}").'
			}
		]
	}
};
