'use strict';

var Chiffon = require('../chiffon');

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
  minify: getFixtureFiles('minify')
};


describe('Chiffon', function() {

  describe('tokenize', function() {
    Object.keys(libs).forEach(function(name) {
      it(name, function() {
        var code = libs[name];
        assert(code.length > 0);
        var chiffon_tokens = Chiffon.tokenize(code);
        var esprima_tokens = esprima.parse(code, { tokens: true }).tokens;
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
        var tokens = Chiffon.tokenize(code);
        assert.deepEqual(tokens, expected);
      });
    });
  });

  describe('minify', function() {
    Object.keys(libs).forEach(function(name) {
      it(name, function() {
        var code = libs[name];
        assert(code.length > 0);
        var minCode = Chiffon.minify(code);
        assert(minCode.length > 0);
        assert(code.length > minCode.length);
        testSyntax(minCode);
      });
    });

    fixtures.minify.test.forEach(function(testName, i) {
      var no = getFixturesNo(testName);
      it('fixtures ' + no, function() {
        var code = fs.readFileSync(testName).toString();
        var expectedName = fixtures.minify.expected[i];
        assert.equal(getFixturesNo(expectedName), no);
        var expected = fs.readFileSync(expectedName).toString();
        var minCode = Chiffon.minify(code);
        assert.equal(minCode, expected);
      });
    });
  });
});


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


function getFiles(dir, files_) {
  files_ = files_ || [];

  var files = fs.readdirSync(dir);
  for (var i in files) {
    if (!files.hasOwnProperty(i)) {
      continue;
    }

    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }

  return files_;
}
