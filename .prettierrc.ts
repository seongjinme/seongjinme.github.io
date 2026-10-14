import { type Config } from 'prettier';

const config: Config = {
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
  arrowParens: 'always',
  bracketSpacing: true,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  singleAttributePerLine: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: 'auto',
};

export default config;
