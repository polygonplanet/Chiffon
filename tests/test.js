'use strict';

const Chiffon = require('../chiffon');
let ChiffonMin;

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const esprima = require(path.resolve(__dirname, 'thirdparty/esprima'));
const acorn = require(path.resolve(__dirname, 'thirdparty/acorn'));

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const FIXTURES_MINIFY_DIR = path.resolve(FIXTURES_DIR, 'minify');
const THIRDPARTY_DIR = path.resolve(__dirname, 'thirdparty');

const THIRDPARTY_LIBS = [
  'angular',
  'backbone',
  //'bluebird',
  'esprima',
  'jquery-ui',
  'jquery',
  'moment',
  'react-with-addons',
  'underscore'
].reduce((memo, libraryName) => {
  // Preload all source instead of reading per-iteration:
  // memory cost is negligible and it avoids repeated disk I/O.
  memo[libraryName] = readThirdpartyLibrary(libraryName);
  return memo;
}, {});

const methods = {
  parse: {
    dir: FIXTURES_DIR,
    pathName: 'parse',
    errorPathName: 'parse-error',
    expectedExt: 'json',
    execute: (chiffon, code, options) => {
      return chiffon.parse(code, options);
    }
  },
  tokenize: {
    dir: FIXTURES_DIR,
    pathName: 'tokenize',
    expectedExt: 'json',
    execute: (chiffon, code, options) => {
      return chiffon.tokenize(code, options);
    }
  },
  tokenizeLocRange: {
    dir: FIXTURES_DIR,
    pathName: 'tokenize-loc-range',
    expectedExt: 'json',
    execute: (chiffon, code, options) => {
      return chiffon.tokenize(code, options);
    }
  },
  minify: {
    dir: FIXTURES_MINIFY_DIR,
    pathName: 'minify',
    expectedExt: 'js',
    execute: (chiffon, code, options) => {
      return chiffon.minify(code, options);
    },
    // `untokenize()` uses the test cases for minify
    executeUntokenize: (chiffon, tokens, options) => {
      return chiffon.untokenize(tokens, options);
    }
  }
};

/*
const fixtures = {
  test: {
    '0001': { fileName: 'test-0001.js', isModule: false },
    '0002': { fileName: 'test-0002.js', isModule: false },
    ...
  },
  minify: {
    '0001': {
      expectedFileName: 'test-0001-minify-expected.js',
      expectError: false
    },
    ...
  },
  parse: {
    '0001': {
      expectedFileName: 'test-0001-parse-expected.json',
      expectError: false
    },
    ...
  },
  tokenize: {
    '0001': {
      expectedFileName: 'test-0001-tokenize-expected.json',
      expectError: false
    },
    ...
  },
  tokenizeLocRange: {
    '0001': {
      expectedFileName: 'test-0001-tokenize-loc-range-expected.json',
      expectError: false
    },
    ...
  },
  untokenize: {
    '0001': {
      expectedFileName: 'test-0001-untokenize-expected.js',
      expectError: false
    },
    ...
  },
};
*/
const fixtures = {
  test: {},
  minify: {},
  parse: {},
  tokenize: {},
  tokenizeLocRange: {}
};

const fixtureCache = {};
parseFixtures();

const min = process.argv.slice().pop() === '--min';
runTest('Chiffon', Chiffon);

if (min) {
  ChiffonMin = require('../chiffon.min');
  runTest('Chiffon (min)', ChiffonMin);
}

function runTest(description, parser) {
  describe(description, () => {
    describe('WhiteSpace', () => {
      const whiteSpaces = [
        0x20, 0x09, 0x0b, 0x0c, 0xa0, 0x1680,
        // 0x180E (Mongolian Vowel Separator) was removed because it was
        // reclassified as a non-whitespace character in Unicode 6.3.0.
        0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000,
        0xfeff
      ];

      whiteSpaces.forEach((ws) => {
        it(`0x${('0000' + ws.toString(16).toUpperCase()).slice(-4)}`, () => {
          const c = String.fromCharCode(ws);
          const dummyExpr = '1 + 2';
          const code = c + dummyExpr + c;

          const chiffonTokens = methods.tokenize.execute(parser, code);
          const esprimaTokens = esprima.parse(code, { tokens: true }).tokens;
          assert.deepEqual(chiffonTokens, esprimaTokens);
        });
      });
    });

    describe('tokenize', () => {
      const methodName = 'tokenize';

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(libraryName, () => {
          assert(code.length > 0);
          const chiffonTokens = methods[methodName].execute(parser, code, { range: true });
          const esprimaTokens = normalizeEsprimaTokens(esprima.parse(code, { tokens: true, range: true }).tokens);
          assert.deepEqual(chiffonTokens, esprimaTokens);
        });
      });

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(`${libraryName} (CRLF)`, () => {
          code = code.replace(/\r\n|\r|\n/g, '\r\n');
          assert(code.length > 0);
          assert(/\r\n/.test(code));

          const chiffonTokens = methods[methodName].execute(parser, code, { range: true });
          const esprimaTokens = normalizeEsprimaTokens(esprima.parse(code, { tokens: true, range: true }).tokens);
          assert.deepEqual(chiffonTokens, esprimaTokens);
        });
      });

      Object.entries(fixtures.tokenize).forEach(([no, { expectedFileName }]) => {
        it(`fixtures ${no}`, () => {
          assert.equal(getFixturesNo(expectedFileName), no);
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);
          const expectedCode = readFixtureFile(methodName, expectedFileName);
          const expected = JSON.parse(expectedCode);
          const tokens = methods[methodName].execute(parser, code);
          assert.deepEqual(tokens, expected);
        });
      });

      Object.entries(fixtures.tokenizeLocRange).forEach(([no, { expectedFileName }]) => {
        it(`fixtures (loc-range) ${no}`, () => {
          const methodName = 'tokenizeLocRange';
          assert.equal(getFixturesNo(expectedFileName), no);
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);
          const expectedCode = readFixtureFile(methodName, expectedFileName);
          const expected = JSON.parse(expectedCode);
          const tokens = methods[methodName].execute(parser, code, { loc: true, range: true });
          assert.deepEqual(tokens, expected);
        });
      });
    });

    describe('untokenize', () => {
      const methodName = 'minify'; // use minify fixtures for untokenize

      Object.entries(fixtures.minify).forEach(([no, { expectedFileName }]) => {
        it('fixtures ' + no, () => {
          assert.equal(getFixturesNo(expectedFileName), no);
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);

          const func = requireFixture(methodName, fixture);
          assert(func() === true);

          const tokens = methods.tokenize.execute(parser, code, {
            comment: true,
            whiteSpace: true,
            lineTerminator: true
          });
          assert(Array.isArray(tokens));

          const untokenized = methods[methodName].executeUntokenize(parser, tokens, {
            unsafe: true
          });
          assert(untokenized === code);
          const resFunc = fakeRequire(untokenized);
          assert(func() === resFunc());
        });
      });
    });

    describe('minify', () => {
      const methodName = 'minify';

      Object.keys(THIRDPARTY_LIBS).forEach((libraryName) => {
        it(libraryName, () => {
          const code = THIRDPARTY_LIBS[libraryName];
          assert(code.length > 0);
          const minCode = methods[methodName].execute(parser, code);
          assert(minCode.length > 0);
          assert(code.length > minCode.length);
          testSyntax(minCode);
        });
      });

      Object.entries(fixtures.minify).forEach(([no, { expectedFileName }]) => {
        it('fixtures ' + no, () => {
          assert.equal(getFixturesNo(expectedFileName), no);
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);
          const expectedCode = readFixtureFile(methodName, expectedFileName);

          const func = requireFixture(methodName, fixture);
          assert(func() === true);

          const minCode = methods[methodName].execute(parser, code);
          assert(code.length > minCode.length);
          testSyntax(minCode);
          assert.strictEqual(minCode, expectedCode.replace(/\n$/, ''));

          const minFunc = fakeRequire(minCode);
          assert(func() === minFunc());
        });
      });
    });

    describe('parse', () => {
      const methodName = 'parse';

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(libraryName, () => {
          assert(code.length > 0);
          const chiffonAst = methods[methodName].execute(parser, code, { loc: true, range: true });
          const esprimaAst = normalizeEsprimaAst(esprima.parse(code, { loc: true, range: true }));
          assert.deepEqual(chiffonAst, esprimaAst);
        });
      });

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(`${libraryName} without location`, () => {
          assert(code.length > 0);
          const chiffonAst = methods[methodName].execute(parser, code);
          const esprimaAst = normalizeEsprimaAst(esprima.parse(code));
          assert.deepEqual(chiffonAst, esprimaAst);
        });
      });

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(`${libraryName} (CRLF)`, () => {
          code = code.replace(/\r\n|\r|\n/g, '\r\n');
          assert(code.length > 0);
          assert(/\r\n/.test(code));
          const chiffonAst = methods[methodName].execute(parser, code, { loc: true, range: true });
          const esprimaAst = normalizeEsprimaAst(esprima.parse(code, { loc: true, range: true }));
          assert.deepEqual(chiffonAst, esprimaAst);
        });
      });

      Object.entries(THIRDPARTY_LIBS).forEach(([libraryName, code]) => {
        it(`${libraryName} without location (CRLF)`, () => {
          code = code.replace(/\r\n|\r|\n/g, '\r\n');
          assert(code.length > 0);
          assert(/\r\n/.test(code));
          const chiffonAst = methods[methodName].execute(parser, code);
          const esprimaAst = normalizeEsprimaAst(esprima.parse(code));
          assert.deepEqual(chiffonAst, esprimaAst);
        });
      });

      Object.entries(fixtures.parse).forEach(([no, { expectedFileName, expectError }]) => {
        it(`fixtures ${no}`, () => {
          assert.equal(getFixturesNo(expectedFileName), no);
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);
          const expectedCode = readFixtureFile(methodName, expectedFileName);
          const expected = JSON.parse(expectedCode);

          if (expectError) {
            assert.throws(
              () => methods[methodName].execute(parser, code, { loc: true, range: true }),
              (e) => {
                assert.strictEqual(e.name, expected.name);
                assert.strictEqual(e.message, expected.message);
                return true;
              }
            );
          } else {
            const ast = methods[methodName].execute(parser, code, { loc: true, range: true });
            normalizeAstForJson(ast);
            assert.deepEqual(ast, expected);
          }
        });
      });

      Object.entries(fixtures.parse).forEach(([no, { expectError }]) => {
        if (expectError) return;

        // Skip fixtures with legitimate AST differences:
        //   0337: chiffon keeps CRLF in template raw/cooked, acorn normalizes to LF (ES spec).
        //   0350: chiffon keeps unicode escapes in Identifier.name (`a`),  acorn decodes to `a`.
        if (no === '0337' || no === '0350') {
          return;
        }

        it(`fixtures (acorn) ${no}`, () => {
          const fixture = getTestFixture(methodName, no);
          const code = readFixtureCode(methodName, fixture);

          let acornAst;
          try {
            acornAst = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
          } catch (e) {
            acornAst = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
          }

          const chiffonAst = methods[methodName].execute(parser, code);
          assert.deepStrictEqual(
            toPlainAst(chiffonAst),
            normalizeAcornAst(toPlainAst(acornAst))
          );
        });
      });
    });
  });
}

function parseFixtures() {
  const pathNames = Object.entries(methods).reduce((memo, [methodName, method]) => {
    memo[method.pathName] = methodName;
    return memo;
  }, {});

  const errorPathNames = Object.entries(methods).reduce((memo, [methodName, method]) => {
    if (method.errorPathName) memo[method.errorPathName] = methodName;
    return memo;
  }, {});

  const dirs = [];
  Object.keys(methods).forEach((methodName) => {
    const dir = methods[methodName].dir;
    if (!dirs.includes(dir)) {
      dirs.push(dir);
    }
  });

  dirs.forEach((dir) => {
    const dirKey = toRelativeDir(dir);

    const fileNames = getFileNames(dir);
    const fixtureFileNames = fileNames.filter((f) => /^test-\d+(?:[-\w]+)?\.(?:js|json)$/.test(f));

    fixtureFileNames.sort((a, b) => {
      const aNo = getFixturesNo(a) - 0;
      const bNo = getFixturesNo(b) - 0;
      return aNo > bNo ? 1 : aNo < bNo ? -1 : 0;
    });

    fixtureFileNames.forEach((fileName) => {
      const testMatch = fileName.match(/^test-(\d+)(-module|)\.js$/);
      if (testMatch) {
        const no = testMatch[1];
        const isModule = !!testMatch[2];

        fixtures.test[dirKey] || (fixtures.test[dirKey] = {});
        fixtures.test[dirKey][no] = { fileName, isModule };
        return;
      }

      const expectedMatch = fileName.match(/^test-(\d+)-(\w+(?:-\w+)*)-expected\.(\w+)$/);
      if (!expectedMatch) {
        return;
      }

      const no = expectedMatch[1];
      const op = expectedMatch[2];
      const ext = expectedMatch[3];
      let expectError = false;
      let matchedMethodName;

      if (pathNames[op]) {
        matchedMethodName = pathNames[op];
      } else if (errorPathNames[op]) {
        matchedMethodName = errorPathNames[op];
        expectError = true;
      } else {
        throw new Error(`Unknown test operation: ${op}`);
      }

      const expectedExt = methods[matchedMethodName].expectedExt;
      if (expectedExt !== ext) {
        throw new Error(`Unexpected file extension for "${op}": .${ext} (expected .${expectedExt})`);
      }
      fixtures[matchedMethodName][no] = { expectedFileName: fileName, expectError };
    });
  });
}

function getFixturesNo(fileName) {
  const match = path.basename(fileName).match(/^\w+-(\d+)/);
  return match ? match[1] : null;
}

function readFixtureFile(methodName, fileName) {
  const key = `${methodName}/${fileName}`;
  if (fixtureCache[key] == null) {
    const dir = getFixtureDir(methodName);
    fixtureCache[key] = fs.readFileSync(path.join(dir, fileName), 'utf8');
  }
  return fixtureCache[key];
}

function readThirdpartyLibrary(libraryName) {
  return fs.readFileSync(path.join(THIRDPARTY_DIR, `${libraryName}.js`), 'utf8');
}

function getFixtureDir(methodName) {
  return methods[methodName].dir;
}

function getTestFixture(methodName, no) {
  const dirKey = toRelativeDir(methods[methodName].dir);
  return fixtures.test[dirKey][no];
}

// '/path/to/tests/fixtures/minify' -> 'fixtures/minify'
function toRelativeDir(dir) {
  return path.relative(__dirname, dir).split(path.sep).join('/');
}

function readFixtureCode(methodName, fixture) {
  const { fileName, isModule } = fixture;
  const dir = getFixtureDir(methodName);

  if (isModule) {
    const mod = require(path.join(dir, fileName));
    return mod.code;
  }
  return readFixtureFile(methodName, fileName);
}

function requireFixture(methodName, fixture) {
  const { fileName } = fixture;
  const dir = getFixtureDir(methodName);
  return require(path.join(dir, fileName));
}

function getFileNames(dir) {
  return fs.readdirSync(dir).filter((f) => fs.statSync(dir + '/' + f).isFile());
}

function testSyntax(code) {
  new Function('return;' + code)();
}

function fakeRequire(code) {
  return new Function(
    // provide `module` so `code` can do `module.exports = ...`
    `var module = { exports: {} };${code};return module.exports;`
  )();
}

// Normalize Esprima's token to be compared against Chiffon's token list
function normalizeEsprimaTokens(tokens) {
  tokens.forEach((token) => {
    if (token.type === 'Identifier' && token.value === 'await') {
      token.type = 'Keyword';
    }
  });
  return tokens;
}

// Normalize Esprima's AST to be compared against Chiffon's AST
function normalizeEsprimaAst(ast) {
  astFilter(ast, [
    {
      type: '*',
      callback: (node) => {
        if (node.directive === 'use strict') {
          delete node.directive;
        }
      }
    },
    {
      type: 'Program',
      callback: (node) => {
        delete node.sourceType;
      }
    },
    {
      type: 'TryStatement',
      callback: (node) => {
        delete node.handlers;
        delete node.guardedHandlers;
      }
    },
    {
      type: 'FunctionDeclaration',
      callback: (node) => {
        if (!node.async) delete node.async;
      }
    },
    {
      type: 'FunctionExpression',
      callback: (node) => {
        if (!node.async) delete node.async;
      }
    },
    {
      type: 'ArrowFunctionExpression',
      callback: (node) => {
        delete node.id;
        delete node.generator;
        if (!node.async) delete node.async;
      }
    },
    {
      // Always add `optional: false` because Chiffon always sets it (ESTree spec),
      // but Esprima 4.0.1 predates optional chaining and never emits it.
      type: 'CallExpression',
      callback: (node) => {
        node.optional = false;
      }
    },
    {
      type: 'MemberExpression',
      callback: (node) => {
        node.optional = false;
      }
    }
  ]);
  return ast;
}

// Normalize Acorn's AST to be compared against Chiffon's AST
function normalizeAcornAst(ast) {
  astFilter(ast, [
    {
      type: '*',
      callback: (node) => {
        delete node.start;
        delete node.end;
        delete node.directive;
      }
    },
    {
      type: 'Program',
      callback: (node) => {
        delete node.sourceType;
      }
    },
    {
      type: ['ImportDeclaration', 'ImportExpression', 'ExportNamedDeclaration', 'ExportAllDeclaration'],
      callback: (node) => {
        delete node.attributes;
      }
    },
    {
      type: 'ForInStatement',
      callback: (node) => {
        node.each = false;
        delete node.await;
      }
    },
    {
      type: ['ForStatement', 'ForOfStatement'],
      callback: (node) => {
        if (!node.await) delete node.await;
      }
    },
    {
      type: ['FunctionDeclaration', 'FunctionExpression'],
      callback: (node) => {
        if (!node.async) delete node.async;
      }
    },
    {
      type: 'ArrowFunctionExpression',
      callback: (node) => {
        delete node.id;
        delete node.generator;
        if (!node.async) delete node.async;
      }
    }
  ]);
  return ast;
}

function toPlainAst(ast) {
  return JSON.parse(JSON.stringify(ast, (key, value) =>
    typeof value === 'bigint' ? String(value) + 'n' : value
  ));
}

// Normalizes Literal `value` fields that JSON cannot represent
function normalizeAstForJson(ast) {
  astFilter(ast, [
    {
      type: 'Literal',
      callback: (node) => {
        if (node.regex && node.value instanceof RegExp) {
          node.value = {};
        } else if (typeof node.value === 'bigint') {
          // JSON cannot represent a BigInt
          node.value = node.value.toString();
        } else if (typeof node.value === 'number' && !isFinite(node.value)) {
          // JSON cannot represent Infinity / -Infinity / NaN
          node.value = null;
        }
      }
    }
  ]);
  return ast;
}

function astFilter(node, filters) {
  if (Array.isArray(node)) {
    node.forEach((child) => astFilter(child, filters));
  } else if (node && typeof node === 'object') {
    filters.forEach((filter) => {
      if (filter.type === '*' || node.type === filter.type ||
        (Array.isArray(filter.type) && filter.type.includes(node.type))) {
        filter.callback(node);
      }
    });
    Object.keys(node).forEach((key) => astFilter(node[key], filters));
  }
}
