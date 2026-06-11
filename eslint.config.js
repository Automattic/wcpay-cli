import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'dist/**',
			'coverage/**',
			'node_modules/**',
			'docs/.vitepress/cache/**',
			'docs/.vitepress/dist/**',
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.ts', '*.js', 'docs/.vitepress/config.ts'],
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', ignoreRestSiblings: true },
			],
		},
	},
	{
		files: ['**/*.cjs', '**/*.js'],
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	}
);
