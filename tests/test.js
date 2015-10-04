'use strict';

var Chiffon = require('../chiffon');

var assert = require('assert');
var fs = require('fs');

describe('Chiffon', function() {
  var code;
  var expected;

  before(function() {
    code = fs.readFileSync(__dirname + '/ecma-code.js');
    expected = require(__dirname + '/ecma-expected.json');
  });

  describe('parse', function() {
    it('parse code', function() {
      var tokens = Chiffon.parse(code);

      assert(Array.isArray(tokens));
      assert(tokens.length > 0);
      assert.deepEqual(tokens, expected);
    });
  });
});
