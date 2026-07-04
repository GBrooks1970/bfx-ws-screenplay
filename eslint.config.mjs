import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'reports/**', 'dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Spec NFR: no `any` outside the Node driver's raw-frame ingress point.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
