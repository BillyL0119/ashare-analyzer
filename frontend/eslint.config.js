import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// This ESLint does not see names used as JSX tags, which twice broke a live page: a component used only as
// <Flag /> was reported unused and removed (2026-11-01), and a removed <Tag /> component was never reported
// missing (2026-10-10). These two rules fill the gap (the same checks as eslint-plugin-react's).
const jsxBase = (node) => { let n = node.name; while (n.type === 'JSXMemberExpression') n = n.object; return n }
const localJsx = {
  rules: {
    'jsx-uses-vars': {
      meta: { type: 'problem', schema: [] },
      create: (ctx) => ({
        JSXOpeningElement(node) {
          const n = jsxBase(node)
          if (n.type === 'JSXIdentifier') ctx.sourceCode.markVariableAsUsed(n.name, node)
        },
      }),
    },
    'jsx-no-undef': {
      meta: { type: 'problem', schema: [] },
      create: (ctx) => ({
        JSXOpeningElement(node) {
          const n = jsxBase(node)
          if (n.type !== 'JSXIdentifier') return
          if (node.name.type === 'JSXIdentifier' && /^[a-z]/.test(n.name)) return     // an HTML element
          for (let s = ctx.sourceCode.getScope(node); s; s = s.upper) if (s.set.has(n.name)) return
          ctx.report({ node, message: `'${n.name}' is not defined (used as a JSX tag)` })
        },
      }),
    },
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { local: localJsx },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'local/jsx-uses-vars': 'error',
      'local/jsx-no-undef': 'error',
    },
  },
])
