'use strict';

var Chiffon = require('../chiffon');

var assert = require('assert');
var fs = require('fs');

describe('Chiffon', function() {
  var code;
  var expected_tokens;
  var expected_minify;

  before(function() {
    code = fs.readFileSync(__dirname + '/ecma-code.js');
    expected_tokens = require(__dirname + '/ecma-expected.json');
    expected_minify = fs.readFileSync(__dirname + '/ecma-minify.js');
  });

  describe('tokenize', function() {
    it('tokenize code', function() {
      var tokens = Chiffon.tokenize(code);

      assert(Array.isArray(tokens));
      assert(tokens.length > 0);
      assert.deepEqual(tokens, expected_tokens);
    });
  });

  describe('minify', function() {
    it('minify code', function() {
      var min = Chiffon.minify(code);
      assert.equal(min, expected_minify);
    });
  });
});
