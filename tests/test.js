'use strict';

var Chiffon = require('../chiffon');
var ChiffonMin;

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var libs = [
  'angular',
  'backbone',
  'bluebird',
  'esprima',
  'jquery-ui',
  'jquery',
  'moment',
  'react-with-addons',
  'underscore'
].reduce(function(obj, name) {
  var buffer = fs.readFileSync(__dirname + '/thirdparty/' + name + '.js');
  obj[name] = buffer.toString();
  return obj;
}, {});

var esprima = require(__dirname + '/thirdparty/esprima');

var fixtures = {
  tokenize: getFixtureFiles('tokenize'),
  tokenizeRange: getFixtureFiles('tokenize/range'),
  tokenizeLoc: getFixtureFiles('tokenize/loc'),
  minify: getFixtureFiles('minify')
};

var min = process.argv.slice().pop() === '--min';

test('Chiffon', Chiffon);

if (min) {
  ChiffonMin = require('../chiffon.min');
  test('Chiffon (min)', ChiffonMin);
}


function test(desc, parser) {
  describe(desc, function() {
    describe('tokenize', function() {
      Object.keys(libs).forEach(function(name) {
        it(name, function() {
          var code = libs[name];
          assert(code.length > 0);
          var chiffon_tokens = parser.tokenize(code, { range: true });
          var esprima_tokens = esprima.parse(code, { tokens: true, range: true }).tokens;
          assert.deepEqual(chiffon_tokens, esprima_tokens);
        });
      });

      Object.keys(libs).forEach(function(name) {
        it(name + ' (CRLF)', function() {
          var code = libs[name].replace(/\r\n|\r|\n/g, '\r\n');
          assert(code.length > 0);
          assert(/\r\n/.test(code));
          var chiffon_tokens = parser.tokenize(code, { range: true });
          var esprima_tokens = esprima.parse(code, { tokens: true, range: true }).tokens;
          assert.deepEqual(chiffon_tokens, esprima_tokens);
        });
      });

      fixtures.tokenize.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var expectedName = fixtures.tokenize.expected[i];
          assert.equal(getFixturesNo(expectedName), no);
          var expected = require(expectedName);
          var tokens = parser.tokenize(code);
          assert.deepEqual(tokens, expected);
        });
      });

      fixtures.tokenizeRange.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures range ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var expectedName = fixtures.tokenizeRange.expected[i];
          assert.equal(getFixturesNo(expectedName), no);
          var expected = require(expectedName);
          var tokens = parser.tokenize(code, { range: true });
          assert.deepEqual(tokens, expected);
        });
      });

      fixtures.tokenizeLoc.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures loc ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var expectedName = fixtures.tokenizeLoc.expected[i];
          assert.equal(getFixturesNo(expectedName), no);
          var expected = require(expectedName);
          var tokens = parser.tokenize(code, { loc: true });
          assert.deepEqual(tokens, expected);
        });
      });
    });

    describe('minify', function() {
      Object.keys(libs).forEach(function(name) {
        it(name, function() {
          var code = libs[name];
          assert(code.length > 0);
          var minCode = parser.minify(code);
          assert(minCode.length > 0);
          assert(code.length > minCode.length);
          testSyntax(minCode);
        });
      });

      fixtures.minify.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var func = require(testName);
          assert(func() === true);
          var minCode = parser.minify(code);

          assert(code.length > minCode.length);
          testSyntax(minCode);

          var minFunc = fakeRequire(minCode);
          assert(func() === minFunc());
        });
      });
    });
  });
}


function getFixtureFiles(type) {
  var files = getFiles(__dirname + '/fixtures/' + type);

  var test = files.filter(function(f) {
    return /test-\d+\.js$/.test(f);
  });
  var expected = files.filter(function(f) {
    return /expected\.\w+$/.test(f);
  });


  var comparator = function(a, b) {
    var a_name = path.basename(a);
    var b_name = path.basename(b);
    var a_no = getFixturesNo(a_name) - 0;
    var b_no = getFixturesNo(b_name) - 0;
    return a_no > b_no ? 1 :
           a_no < b_no ? -1 : 0;
  };

  test.sort(comparator);
  expected.sort(comparator);

  return {
    test: test,
    expected: expected
  };
}


function getFixturesNo(filename) {
  var re = /^\w+-(\d+)/;
  var basename = path.basename(filename);
  return basename.match(re)[1];
}


function testSyntax(code) {
  Function('return;' + code)();
}


function fakeRequire(code) {
  return Function(
    'var module = { exports: {} };' +
    code + ';' +
    'return module.exports;'
  )();
}


function getFiles(dir) {
  var results = [];

  var files = fs.readdirSync(dir);
  for (var i in files) {
    if (!files.hasOwnProperty(i)) {
      continue;
    }

    var name = dir + '/' + files[i];
    if (!fs.statSync(name).isDirectory()) {
      results.push(name);
    }
  }

  return results;
}
