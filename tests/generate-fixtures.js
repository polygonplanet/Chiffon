'use strict';

/**
 * Regenerates the expected fixtures for the parser and tokenizer tests.
 *
 * Usage:
 *   - regenerate all: `node tests/generate-fixtures.js`
 *   - regenerate parser fixtures: `node tests/generate-fixtures.js parse`
 *   - regenerate tokenizer fixtures: `node tests/generate-fixtures.js tokenize`
 *
 * For every fixtures/<group>/test-NNNN.js, this runs Chiffon and writes the
 * result to test-NNNN-expected.json. To add a new test case, create a
 * test-NNNN.js file and run this script; the matching expected file is
 * created automatically.
 *
 * Note on RegExp literals: JSON cannot represent a regular expression, so
 * JSON.stringify serializes a RegExp `value` field as `{}`. No information
 * is lost because the `regex` property still holds the pattern and flags.
 * The test runner applies the same normalization before comparing.
 */

var Chiffon = require('../chiffon');
var fs = require('fs');
var path = require('path');

var groups = {
  parse: [
    {
      dir: 'fixtures/parse',
      run: function (code) {
        return Chiffon.parse(code, { range: true, loc: true });
      }
    }
  ],
  tokenize: [
    {
      dir: 'fixtures/tokenize',
      run: function (code) {
        return Chiffon.tokenize(code);
      }
    },
    {
      dir: 'fixtures/tokenize/range',
      run: function (code) {
        return Chiffon.tokenize(code, { range: true });
      }
    },
    {
      dir: 'fixtures/tokenize/loc',
      run: function (code) {
        return Chiffon.tokenize(code, { loc: true });
      }
    }
  ]
};

var arg = process.argv[2];
var selected;
if (!arg) {
  selected = ['parse', 'tokenize'];
} else if (groups.hasOwnProperty(arg)) {
  selected = [arg];
} else {
  console.error('Unknown group: ' + arg + ' (expected "parse" or "tokenize")');
  process.exit(1);
}

var total = { created: 0, updated: 0, skipped: 0, removed: 0, errors: 0 };

selected.forEach(function (groupName) {
  groups[groupName].forEach(function (group) {
    generate(group);
  });
});

console.log(
  [
    '\nDone: ' + total.created + ' created',
    total.updated + ' updated',
    total.skipped + ' unchanged',
    total.removed + ' stale removed',
    total.errors + ' errors'
  ].join(', ')
);

if (total.errors > 0) {
  process.exit(1);
}

function generate(group) {
  var fixturesDir = path.resolve(__dirname, group.dir);

  var testFiles = fs
    .readdirSync(fixturesDir)
    .filter(function (f) {
      return /^test-\d+\.js$/.test(f);
    })
    .sort();

  testFiles.forEach(function (testFile) {
    var no = testFile.match(/test-(\d+)/)[1];
    var testPath = path.join(fixturesDir, testFile);
    var expectedPath = path.join(fixturesDir, 'test-' + no + '-expected.json');
    var code = fs.readFileSync(testPath).toString();
    var result;
    try {
      result = group.run(code);
    } catch (e) {
      console.log('ERROR ' + group.dir + ' ' + no + ': ' + e.message);
      total.errors++;
      return;
    }

    var newContent = JSON.stringify(result, null, 2) + '\n';

    var exists = fs.existsSync(expectedPath);
    if (exists && fs.readFileSync(expectedPath).toString() === newContent) {
      total.skipped++;
    } else {
      fs.writeFileSync(expectedPath, newContent);
      if (exists) {
        console.log('UPDATE ' + group.dir + ' ' + no);
        total.updated++;
      } else {
        console.log('CREATE ' + group.dir + ' ' + no);
        total.created++;
      }
    }
  });
}
