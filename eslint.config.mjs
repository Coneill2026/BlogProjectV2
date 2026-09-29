import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import typescript from 'typescript-eslint';

export default [
	{
		ignores: ['dist/**', '.astro/**', 'node_modules/**', 'cdk/cdk.out/**'],
	},
	eslint.configs.recommended,
	...typescript.configs.recommended,
	...astro.configs.recommended,
];
