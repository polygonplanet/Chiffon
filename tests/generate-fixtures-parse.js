'use strict';

/**
 * Regenerates the expected AST fixtures for the parser tests.
 *
 * Usage:
 *   `node tests/generate-fixtures-parse.js`
 *
 * For every tests/fixtures/parse/test-NNNN.js, this parses the source with
 * Chiffon and writes the resulting AST to test-NNNN-expected.json.
 * To add a new test case, create a test-NNNN.js file and run this script;
 * the matching expected file is created automatically.
 *
 * Note on RegExp literals: JSON cannot represent a regular expression, so
 * JSON.stringify serializes a RegExp `value` field as `{}`. No information
 * is lost because the `regex` property still holds the pattern and flags.
 * The test runner applies the same normalization before comparing.
 */

var Chiffon = require('../chiffon');
var fs = require('fs');
var path = require('path');

var fixturesDir = path.resolve(__dirname, 'fixtures/parse');

var testFiles = fs
  .readdirSync(fixturesDir)
  .filter(function (f) {
    return /^test-\d+\.js$/.test(f);
  })
  .sort();

var created = 0;
var updated = 0;
var skipped = 0;
var errors = 0;

testFiles.forEach(function (testFile) {
  var no = testFile.match(/test-(\d+)/)[1];
  if (!no) {
    console.log('Invalid test file name: ' + testFile);
    errors++;
    return;
  }

  var testPath = path.join(fixturesDir, testFile);
  var expectedPath = path.join(fixturesDir, 'test-' + no + '-expected.json');

  var code = fs.readFileSync(testPath).toString();
  var ast;
  try {
    ast = Chiffon.parse(code, { range: true, loc: true });
  } catch (e) {
    console.log('ERROR ' + no + ': ' + e.message);
    errors++;
    return;
  }

  var newContent = JSON.stringify(ast, null, 4) + '\n';

  var exists = fs.existsSync(expectedPath);
  if (exists && fs.readFileSync(expectedPath).toString() === newContent) {
    skipped++;
    return;
  }

  fs.writeFileSync(expectedPath, newContent);
  if (exists) {
    console.log('UPDATE ' + no);
    updated++;
  } else {
    console.log('CREATE ' + no);
    created++;
  }
});

console.log(
  ['\nDone: ' + created + ' created', updated + ' updated', skipped + ' unchanged', errors + ' errors'].join(', ')
);
