/**
 * Chiffon
 *
 * @description  A very small ECMAScript parser, tokenizer and minify written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minify library
 * @version      1.1.4
 * @date         2015-10-06
 * @link         https://github.com/polygonplanet/Chiffon
 * @copyright    Copyright (c) 2015 polygon planet <polygon.planet.aqua@gmail.com>
 * @license      Licensed under the MIT license.
 */

/*jshint bitwise:false, eqnull:true */
(function(name, context, factory) {

  // Supports UMD. AMD, CommonJS/Node.js and browser context
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = factory();
    } else {
      exports[name] = factory();
    }
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    context[name] = factory();
  }

}('Chiffon', this, function() {
  'use strict';

  var Chiffon = {};

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var Keywords = (function(words) {
    words = words.split(/\s+/);
    var kw = {};
    for (var i = 0, len = words.length; i < len; i++) {
      kw[words[i]] = 1;
    }
    return kw;
  }(
    // ECMA-262 11.6.2.1 Keywords
    'break do in typeof case else instanceof var ' +
    'catch export new void class extends return while const finally ' +
    'super with continue for switch yield debugger function this default ' +
    'if throw delete import try ' +
    'arguments eval ' +
    // ECMA-262 11.6.2.2 Future Reserved Words
    'enum await ' +
    'implements package protected interface private public'
  ));


  var _Comment = 'Comment',
      _LineTerminator = 'LineTerminator',
      _Template = 'Template',
      _String = 'String',
      _Punctuator = 'Punctuator',
      _RegularExpression = 'RegularExpression',
      _Numeric = 'Numeric',
      _UnicodeEscapeSequence = 'UnicodeEscapeSequence',
      _Identifier = 'Identifier',
      _Null = 'Null',
      _Boolean = 'Boolean',
      _Keyword = 'Keyword';


  var TokenName = {
    2: _Comment,
    3: _Comment,
    4: _LineTerminator,
    5: _Comment,
    6: _Template,
    7: _String,
    8: _Punctuator,
    9: _LineTerminator,
    10: _RegularExpression,
    11: _Numeric,
    12: _Punctuator,
    13: _UnicodeEscapeSequence,
    14: _LineTerminator,
    15: _Identifier
  };


  var lineTerminator = '\\r\\n\\u2028\\u2029';
  var lineTerminatorSequence = '(?:\\r\\n|[' + lineTerminator + '])';
  var whiteSpace = '(?:(?![' + lineTerminator + '])\\s)+';
  var regexpFlags = makeRegExpFlagPattern('gimuy');
  var literalSuffix = '(?=' +
    '\\s*' +
    '(?:' + '(?!\\s*[/\\\\<>*+%`^"\'\\w$-])' +
            '[^/\\\\<>*+%`^\'"({[\\w$-]' +
      '|' + '[!=]==?' +
      '|' + '[|][|]' +
      '|' + '&&' +
      '|' + '/[*/]' +
      '|' + '[,.;:!?)}\\]' + lineTerminator + ']' +
      '|' + '$' +
    ')' +
  ')';

  var tokenizePattern = new RegExp(
    '(' + // (2) multiline comment
          '(/[*][\\s\\S]*?[*]/)' +
          // (3) single line comment
    '|' + '(' + '//[^' + lineTerminator + ']*' +
          '|' + '<!--[^' + lineTerminator + ']*' +
          ')' +
          // (4) line terminators
    '|' + '(?:^|(' + lineTerminatorSequence + '))' +
          '(?:' + whiteSpace + '|)' +
          // (5) single line comment
          '(' + '-->[^' + lineTerminator + ']*' +
          ')' +
          // (6) template literal
    '|' + '(' + '`(?:\\\\[\\s\\S]|[^`\\\\])*`' +
          ')' + literalSuffix +
          // (7) string literal
    '|' + '(' + '"(?:\\\\[\\s\\S]|[^"' + lineTerminator + '\\\\])*"' +
          '|' + "'(?:\\\\[\\s\\S]|[^'" + lineTerminator + "\\\\])*'" +
          ')' +
          // (8) regexp literal prefix
    '|' + '(' + '^' +
          '|' + '[-!%&*+,/:;<=>?[{(^|~]' +
          ')' +
          '(?:' + whiteSpace +
          // (9) line terminators
          '|' + '(' + lineTerminatorSequence + ')' +
          ')?' +
          '(?:' +
            // (10) regular expression literal
            '(' +
                '(?:/(?![*])(?:\\\\.|[^/' + lineTerminator + '\\\\])+/)' +
                '(?:' + regexpFlags + '|)' +
            ')' + literalSuffix +
          ')' +
          // (11) numeric literal
    '|' + '(' + '0(?:' + '[xX][0-9a-fA-F]+' +
                   '|' + '[oO][0-7]+' +
                   '|' + '[bB][01]+' +
                   ')' +
          '|' + '(?:\\d+(?:[.]\\d*)?|[.]\\d+)(?:[eE][+-]?\\d+)?' +
          '|' + '[1-9]\\d*' +
          '|' + '0[0-7]+' +
          ')' +
          // (12) operators
    '|' + '(' + '>>>=?|[.]{3}|<<=|===|!==|>>=' +
          '|' + '[+][+](?=[+])|--(?=-)' +
          '|' + '[=!<>*%+/&|^-]=' +
          '|' + '&&|[|][|]|[+][+]|--|<<|>>|=>' +
          '|' + '[-+*/%<>=&|^~!?:;,.()[\\]{}]' +
          ')' +
          // (13) unicode character
    '|' + '(' + '\\\\u[0-9a-fA-F]{4}' +
          ')' +
    '|' + whiteSpace +
          // (14) line terminators
    '|' + '(' + lineTerminatorSequence + ')' +
          // (15) identifier
    '|' + '(' + '[^\\s+/%*=&|^~<>!?:;,.()[\\]{}\'"`-]+' +
          ')' +
    ')',
    'g'
  );


  function makeRegExpFlagPattern(flags) {
    flags = flags.split('');

    var len = flags.length;
    var patterns = {};
    var i, j, k, l, m;
    var c, c2, c3, c4, c5;

    var add = function(f) {
      if (!/(.).*\1/.test(f)) {
        patterns[f] = 1;
      }
    };

    for (i = 0; i < len; i++) {
      c = flags[i];
      patterns[c] = 1;

      for (j = 0; j < len; j++) {
        c2 = flags[j];
        add(c + c2);

        for (k = 0; k < len; k++) {
          c3 = flags[k];
          add(c + c2 + c3);

          for (l = 0; l < len; l++) {
            c4 = flags[l];
            add(c + c2 + c3 + c4);

            for (m = 0; m < len; m++) {
              c5 = flags[m];
              add(c + c2 + c3 + c4 + c5);
            }
          }
        }
      }
    }

    return '(?:' + getKeys(patterns).join('|') + ')';
  }


  function parseMatches(match, options) {
    var tokens = [];
    var tokenKeys = getKeys(TokenName);

    for (var i = 0, len = tokenKeys.length; i < len; i++) {
      var key = tokenKeys[i];
      var value = match[key];
      if (!value) {
        continue;
      }

      var name = TokenName[key];
      if ((name === _Comment && !options.comment) ||
          (name === _LineTerminator && !options.lineTerminator)) {
        continue;
      }

      var type = name;
      if (name === _Identifier) {
        if (value === 'null') {
          type = _Null;
        } else if (value === 'true' || value === 'false') {
          type = _Boolean;
        } else if (hasOwnProperty.call(Keywords, value)) {
          type = _Keyword;
        }
      }

      tokens[tokens.length] = {
        type: type,
        value: value
      };
    }

    return tokens;
  }


  function tokenize(code, options) {
    options = options || {};

    var results = [];
    var m;

    tokenizePattern.lastIndex = 0;
    while ((m = tokenizePattern.exec(code)) != null) {
      var tokens = parseMatches(m, options);
      for (var i = 0, len = tokens.length; i < len; i++) {
        results[results.length] = tokens[i];
      }
    }

    return results;
  }

  /**
   * Tokenize a string code.
   *
   * @param {string} code Target code.
   * @param {Object} [options] Tokenize options.
   *   - comment: {boolean} (default=false)
   *     true = Keep comment tokens.
   *   - lineTerminator: {boolean} (default=false)
   *     true = Keep line feed tokens.
   * @return {string} Return an array of the parsed tokens.
   */
  Chiffon.tokenize = tokenize;


  function untokenize(tokens) {
    var ident = /[^\s+\/%*=&|^~<>!?:;,.()[\]{}'"`-]/;
    var sign = /[+-]/;

    var results = [];
    var prev;

    for (var i = 0, len = tokens.length; i < len; prev = tokens[i++]) {
      var token = tokens[i];

      if (!prev) {
        if (token.type !== _LineTerminator) {
          results[results.length] = token.value;
        }
        continue;
      }

      if (prev.type === _LineTerminator && token.type === _LineTerminator) {
        continue;
      }

      var space = '';
      if ((sign.test(token.value) && sign.test(prev.value)) ||
          (ident.test(prev.value.slice(-1)) && ident.test(token.value.charAt(0)))) {
        space = ' ';
      }

      results[results.length] = space + token.value;
    }

    return results.join('');
  }

  /**
   * Concatenate to string from the parsed tokens.
   *
   * @param {Array} tokens An array of the parsed tokens.
   * @return {string} Return a concatenated string.
   */
  Chiffon.untokenize = untokenize;


  function minify(code) {
    return untokenize(tokenize(code, { lineTerminator: true }));
  }

  /**
   * Minify JavaScript code.
   *
   * @param {string} code Target code.
   * @return {string} Return a minified code.
   */
  Chiffon.minify = minify;


  function getKeys(object) {
    if (Object.keys) {
      return Object.keys(object);
    }

    var keys = [];
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        keys[keys.length] = key;
      }
    }
    return keys;
  }


  return Chiffon;
}));
