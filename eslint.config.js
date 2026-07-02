const globals = require('globals');

const styleRules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-useless-escape': 'warn',
  'no-empty': 'off',
  'no-console': 'warn',

  //TODO: use @stylistic/eslint-plugin instead of core rules for formatting in ESLint v10+
  'comma-dangle': ['error', 'never'],
  'indent': [
    'error',
    2,
    {
      ArrayExpression: 1,
      ignoreComments: true,
      ignoredNodes: ['ConditionalExpression', 'VariableDeclarator'],
      MemberExpression: 1,
      ObjectExpression: 1,
      outerIIFEBody: 'off',
      SwitchCase: 1
    }
  ],
  'key-spacing': ['error', { beforeColon: false, afterColon: true }],
  'keyword-spacing': 'error',
  'max-len': [
    'error',
    {
      code: 120,
      tabWidth: 2,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true
    }
  ],
  'no-mixed-spaces-and-tabs': 'error',
  'no-multiple-empty-lines': ['error', { max: 2 }],
  'no-tabs': 'error',
  'object-curly-spacing': ['error', 'always', { objectsInObjects: false }],
  'quotes': ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
  'quote-props': ['error', 'consistent-as-needed', { keywords: true }],
  'semi': 'error',
  'space-infix-ops': 'error',
  'space-unary-ops': 'error'
};

module.exports = [
  {
    ignores: ['node_modules/**', '*.min.js', 'tests/thirdparty/**', '**/fixtures/**']
  },
  {
    files: ['chiffon.js'],
    languageOptions: {
      // Use "ecmaVersion: 5" because chiffon.js is hand-written in ES5
      // without any transpilation and released as-is.
      ecmaVersion: 5,
      sourceType: 'script',
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.amd,
        ...globals.es2021
      }
    },
    rules: {
      ...styleRules
    }
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js', 'Gruntfile.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      parserOptions: {
        ecmaFeatures: {
          globalReturn: true,
          impliedStrict: true
        }
      },
      globals: {
        ...globals.node,
        ...globals.mocha
      }
    },
    rules: {
      ...styleRules,
      'no-console': 'off',
      'comma-dangle': ['error', 'only-multiline']
    }
  }
];
