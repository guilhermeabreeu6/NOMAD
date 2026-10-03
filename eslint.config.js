import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const htmlSinks = [
  {
    selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
    message: 'Proibido atribuir innerHTML/outerHTML: use textContent/atributos.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Proibido insertAdjacentHTML.',
  },
  {
    selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
    message: 'Proibido document.write.',
  },
  {
    selector: "CallExpression[callee.property.name=/^(parseFromString|createContextualFragment)$/]",
    message: 'Proibido parsear HTML de string.',
  },
  {
    selector: "AssignmentExpression[left.property.name='srcdoc']",
    message: 'Proibido atribuir srcdoc.',
  },
  { selector: "CallExpression[callee.name='eval']", message: 'Proibido eval.' },
  { selector: "NewExpression[callee.name='Function']", message: 'Proibido new Function.' },
];

export default tseslint.config(
  {
    ignores: [
      'dist*/**',
      '.astro/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
      'public/**',
      'assets/**',
      'docs/**',
      'planilha/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['src/**/*.ts', 'tests/**/*.ts', '*.ts'] })),
  ...astro.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', '*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,astro}'],
    rules: { 'no-restricted-syntax': ['error', ...htmlSinks], 'astro/no-set-html-directive': 'error' },
  },
  {
    files: ['src/scripts/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/data/product-images', '**/data/product-images.ts'], message: 'Só para o build (.astro).' },
            { group: ['astro:*'], message: 'Cliente não importa astro:*.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'src/lib é lógica pura, sem DOM.' },
        { name: 'document', message: 'src/lib é lógica pura, sem DOM.' },
      ],
    },
  },
  {
    // Promoções dependem da hora: o "agora" é sempre injetado (src/scripts/clock.ts), nunca lido escondido.
    files: ['src/lib/**/*.ts', 'src/scripts/**/*.ts'],
    ignores: ['src/scripts/clock.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Use o relógio injetado (src/scripts/clock.ts).' },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.mjs', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
