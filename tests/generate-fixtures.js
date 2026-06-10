/**
 * Regenerates the expected fixtures for the parser and tokenizer tests.
 *
 * Usage:
 *   - regenerate all: `node tests/generate-fixtures.js`
 *   - regenerate parser fixtures: `node tests/generate-fixtures.js parse`
 *   - regenerate tokenizer fixtures: `node tests/generate-fixtures.js tokenize`
 *
 * For every fixtures/test-NNNN.js, this runs Chiffon and writes the result to
 * test-NNNN-xxx-expected.json. To add a new test case, create a
 * test-NNNN.js file and run this script; the matching expected file is
 * created automatically.
 *
 * Note on RegExp literals: JSON cannot represent a regular expression, so
 * JSON.stringify serializes a RegExp `value` field as `{}`. No information
 * is lost because the `regex` property still holds the pattern and flags.
 * The test runner applies the same normalization before comparing.
 */
'use strict';

const Chiffon = require('../chiffon');
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const FIXTURES_MINIFY_DIR = path.resolve(FIXTURES_DIR, 'minify');

const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

const methods = {
  parse: {
    dir: FIXTURES_DIR,
    pathName: 'parse',
    errorPathName: 'parse-error',
    expectedExt: 'json',
    method: (code) => {
      return Chiffon.parse(code, { loc: true, range: true });
    }
  },
  tokenize: {
    dir: FIXTURES_DIR,
    pathName: 'tokenize',
    expectedExt: 'json',
    method: (code) => {
      return Chiffon.tokenize(code);
    }
  },
  tokenizeLocRange: {
    dir: FIXTURES_DIR,
    pathName: 'tokenize-loc-range',
    expectedExt: 'json',
    method: (code) => {
      return Chiffon.tokenize(code, { loc: true, range: true });
    }
  },
  minify: {
    dir: FIXTURES_MINIFY_DIR,
    pathName: 'minify',
    expectedExt: 'js',
    method: (code) => {
      return Chiffon.minify(code);
    }
  }
};

function generateExpected(selectedMethods = []) {
  const getTestFiles = (dir) => {
    return fs
      .readdirSync(dir)
      .filter((f) => /^test-\d+(?:-module)?\.js$/.test(f))
      .sort();
  };

  const testFilesByDir = {};
  Object.values(methods).forEach(({ dir }) => (testFilesByDir[dir] = getTestFiles(dir)));

  Object.entries(testFilesByDir).forEach(([targetDir, testFiles]) => {
    testFiles.forEach((testFile) => {
      const testMatch = testFile.match(/^test-(\d+)(-module|)\.js$/);
      if (!testMatch) return;

      const no = testMatch[1];
      const isModule = !!testMatch[2];
      const testPath = path.join(targetDir, testFile);

      let code;
      if (isModule) {
        const mod = require(testPath);
        code = mod.code;
      } else {
        code = fs.readFileSync(testPath).toString();
      }

      Object.entries(methods).forEach(([methodName, { dir, pathName, errorPathName, expectedExt, method }]) => {
        if (dir !== targetDir) {
          return;
        }

        if (!selectedMethods.includes(methodName)) {
          return;
        }

        const expectedPath = path.join(targetDir, `test-${no}-${pathName}-expected.${expectedExt}`);

        let result;
        try {
          result = method(code);
        } catch (e) {
          if (errorPathName) {
            const errorResult = {
              name: e.name,
              message: e.message
            };
            const errorExpectedPath = path.join(targetDir, `test-${no}-${errorPathName}-expected.${expectedExt}`);
            writeExpected(errorExpectedPath, errorResult, `${methodName} ${no} (error)`);
            return;
          }

          console.log(`ERROR ${methodName} ${no}: ${e.message}`);
          stats.errors++;
          return;
        }

        writeExpected(expectedPath, result, `${methodName} ${no}`);
      });
    });
  });
}

function writeExpected(expectedPath, result, logLabel) {
  const isJson = expectedPath.endsWith('.json');

  writeFile(expectedPath, (isJson ? JSON.stringify(result, bigintReplacer, 2) : result) + '\n', logLabel);
}

function writeFile(filePath, content, logLabel) {
  const exists = fs.existsSync(filePath);
  if (exists && fs.readFileSync(filePath).toString() === content) {
    stats.skipped++;
  } else {
    fs.writeFileSync(filePath, content);
    if (exists) {
      console.log(`UPDATE ${logLabel}`);
      stats.updated++;
    } else {
      console.log(`CREATE ${logLabel}`);
      stats.created++;
    }
  }
}

function bigintReplacer(key, value) {
  return typeof value === 'bigint' ? value.toString() : value;
}

// tokenize-loc-range -> tokenizeLocRange
// tokenize_loc_range -> tokenizeLocRange
// tokenizeLocRange -> tokenizeLocRange
// "tokenize loc range" -> tokenizeLocRange
function normalizeArg(arg) {
  if (!arg) {
    return '';
  }
  return arg
    .toLowerCase()
    .split(/[^a-zA-Z0-9]+/)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function run() {
  const defaultMethods = ['parse', 'tokenize', 'tokenizeLocRange', 'minify'];
  let selected;
  const arg = normalizeArg(process.argv[2]);

  if (!arg) {
    selected = [...defaultMethods];
  } else if (defaultMethods.includes(arg)) {
    selected = [arg];
  } else {
    console.error(`Unknown method: ${arg} (expected ${defaultMethods.join(', ')})`);
    process.exit(1);
  }

  generateExpected(selected);
  console.log(
    [
      `\nDone: ${stats.created} created`,
      `${stats.updated} updated`,
      `${stats.skipped} unchanged`,
      `${stats.errors} errors`
    ].join(', ')
  );

  if (stats.errors > 0) {
    process.exit(1);
  }
}

run();
