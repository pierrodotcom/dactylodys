export default {
	outdir: './src/lib/paraglide',
	// No storage strategy: Paraglide reads localStorage and cookies without guarding against a refusal.
	strategy: ['baseLocale'],
	emitTsDeclarations: true
};
