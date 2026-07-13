import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import prettierConfig from 'eslint-config-prettier'

export default [
  { ignores: ['out/**', 'node_modules/**'] },

  // Main e preload — ambiente Node.js, sem JSX
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^_+$', argsIgnorePattern: '^_' }],
    },
  },

  // Renderer — ambiente browser + React
  {
    files: ['src/renderer/**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Padrão intencional: setState síncrono em useEffect para reset de estado derivado
      'react-hooks/set-state-in-effect': 'off',
      // Permite catch vazio intencional (ex.: resize silencioso no terminal)
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Permite variáveis prefixadas com _ em destructuring de omissão
      'no-unused-vars': ['error', { varsIgnorePattern: '^_+$', argsIgnorePattern: '^_' }],
    },
  },

  // Prettier desliga regras de formatação que conflitam
  prettierConfig,
]
