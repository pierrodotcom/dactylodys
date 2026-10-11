/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [
			2,
			'always',
			[
				'feat',
				'fix',
				'docs',
				'test',
				'refactor',
				'chore',
				'content',
				'a11y',
				'ci',
				'perf',
				'revert'
			]
		],
		'header-max-length': [2, 'always', 100],
		'subject-case': [0],
		'body-max-line-length': [0]
	}
};
