import baseConfig from '@fiscaliza/config/eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  ...baseConfig,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  reactHooks.configs['recommended-latest'],
  {
    settings: {
      react: { version: '19' },
    },
    rules: {
      'react/prop-types': 'off',
    },
  },
];
