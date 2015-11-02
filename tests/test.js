/* global describe, it, expect, require */
(function test_chiffon() {
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
  minify: getFixtureFiles('minify'),
  parse: getFixtureFiles('parse')
};

fixtures.untokenize = fixtures.minify;

var min = process.argv.slice().pop() === '--min';

test('Chiffon', Chiffon);

if (min) {
  ChiffonMin = require('../chiffon.min');
  test('Chiffon (min)', ChiffonMin);
}

function test(desc, parser) {
  describe(desc, function() {
    describe('WhiteSpace', function() {
      var whiteSpaces = [
        0x20, 0x09, 0x0B, 0x0C, 0xA0,
        0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004,
        0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F,
        0x205F, 0x3000, 0xFEFF
      ];
      whiteSpaces.forEach(function(ws) {
        it('0x' + ('0000' + ws.toString(16).toUpperCase()).slice(-4), function() {
          var c = String.fromCharCode(ws);
          var code = c + '1';
          var chiffon_tokens = parser.tokenize(code);
          var esprima_tokens = esprima.parse(code, { tokens: true }).tokens;
          assert.deepEqual(chiffon_tokens, esprima_tokens);
        });
      });
    });

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

    describe('untokenize', function() {
      fixtures.untokenize.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var func = require(testName);
          assert(func() === true);
          var tokens = parser.tokenize(code, {
            comment: true,
            whiteSpace: true,
            lineTerminator: true
          });
          assert(Array.isArray(tokens));
          var result = parser.untokenize(tokens, {
            unsafe: true
          });

          assert(result === code);
          var resFunc = fakeRequire(result);
          assert(func() === resFunc());
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

    describe('parse', function() {
      Object.keys(libs).forEach(function(name) {
        it(name, function() {
          var code = libs[name];
          assert(code.length > 0);
          var chiffon_ast = parser.parse(code, { range: true, loc: true });
          var esprima_ast = esprima.parse(code, { range: true, loc: true });
          esprima_ast = filterForEsprima(esprima_ast);
          assert.deepEqual(chiffon_ast, esprima_ast);
          chiffon_ast = esprima_ast = null;
        });
      });

      fixtures.parse.test.forEach(function(testName, i) {
        var no = getFixturesNo(testName);
        it('fixtures ' + no, function() {
          var code = fs.readFileSync(testName).toString();
          var expectedName = fixtures.parse.expected[i];
          assert.equal(getFixturesNo(expectedName), no);
          var expected = require(expectedName);
          var ast = parser.parse(code, { range: true, loc: true });
          assert.deepEqual(ast, expected);
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
  /*jslint evil: true */
  new Function('return;' + code)();
}


function fakeRequire(code) {
  /*jslint evil: true */
  return new Function(
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


function filterForEsprima(ast) {
  astFilter(ast, [
    {
      type: 'Program',
      callback: function(node) {
        delete node.sourceType;
      }
    },
    {
      type: 'Property',
      callback: function(node) {
        delete node.computed;
        delete node.method;
        delete node.shorthand;
      }
    },
    {
      type: 'TryStatement',
      callback: function(node) {
        delete node.handlers;
      }
    }
  ]);
  return ast;
}


function astFilter(node, filters) {
  if (Array.isArray(node)) {
    node.forEach(function(child) {
      astFilter(child, filters);
    }, this);
  } else if (node && typeof node === 'object') {
    filters.forEach(function(filter) {
      if (node.type === filter.type) {
        filter.callback(node);
      }
    });
    Object.keys(node).forEach(function(key) {
      astFilter(node[key], filters);
    }, this);
  }
}

}());
