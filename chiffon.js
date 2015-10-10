/**
 * Chiffon
 *
 * @description  A very small ECMAScript parser, tokenizer and minify written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minify library
 * @version      1.2.0
 * @date         2015-10-10
 * @link         https://github.com/polygonplanet/Chiffon
 * @copyright    Copyright (c) 2015 polygon planet <polygon.planet.aqua@gmail.com>
 * @license      Licensed under the MIT license.
 */

/*jshint bitwise:false, eqnull:true */
(function(name, context, factory) {

  // Supports AMD, Node.js, CommonJS and browser context.
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

  var DEFAULT_MAXLINELEN = 32000;

  var isKeyword = (function(words) {
    var keywords = new RegExp('^(?:' + words.split(/\s+/).join('|') + ')$');
    return function(ident) {
      return keywords.test(ident);
    };
  }(
    // ECMA-262 11.6.2.1 Keywords
    'var function this return if else typeof for const new break do ' +
    'in void case instanceof catch export class extends while finally ' +
    'super with continue switch yield debugger default ' +
    'throw delete import try ' +
    // Reserved keywords
    'let static ' +
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

  var capturedToken = [
    '',
    _Comment,
    _Comment,
    _LineTerminator,
    _Comment,
    _Template,
    _String,
    _RegularExpression,
    _Numeric,
    _Punctuator,
    _UnicodeEscapeSequence,
    _LineTerminator,
    _Identifier
  ];
  var capturedTokenLen = capturedToken.length;
  var regularExpressionIndex = 7;

  var identRe = /[^\s+\/%*=&|^~<>!?:;,.()[\]{}'"`-]/;
  var signRe = /[+-]/;

  var lineTerminator = '\\r\\n\\u2028\\u2029';
  var lineTerminatorSequence = '(?:\\r\\n|[' + lineTerminator + '])';
  var whiteSpace = '(?:(?![' + lineTerminator + '])\\s)+';
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
  var punctuators = '(?:' +
          '>>>=?|[.]{3}|<<=|===|!==|>>=' +
    '|' + '[+][+](?=[+])|--(?=-)' +
    '|' + '[=!<>*%+/&|^-]=' +
    '|' + '&&|[|][|]|[+][+]|--|<<|>>|=>' +
    '|' + '[-+*/%<>=&|^~!?:;,.()[\\]{}]' +
  ')';
  var regexpLiteral = '(?:' +
    '/(?![*])(?:\\\\.|[^/' + lineTerminator + '\\\\])+/' +
    '(?:[gimuy]{0,5}|\\b)' +
  ')';
  var validRegExpPrefix = new RegExp('(?:' +
          '(?:^(?:typeof|in|void|case|instanceof|yield|throw|delete)$)' +
    '|' + '(?:' + '(?![.)\\]])' + punctuators + '$)' +
  ')');

  var tokenizePatternAll = new RegExp(getPattern(true), 'g');
  var tokenizePattern = new RegExp(getPattern(), 'g');

  function getPattern(all) {
    return '(?:' +
          // (1) multiline comment
          '(' + '/[*][\\s\\S]*?[*]/' + ')' +
          // (2) single line comment
    '|' + '(' + '//[^' + lineTerminator + ']*' +
          '|' + '<!--[^' + lineTerminator + ']*' +
          ')' +
          // (3) line terminators
    '|' + '(?:^|(' + lineTerminatorSequence + '))' +
          '(?:' + whiteSpace + '|)' +
          // (4) single line comment
          '(' + '-->[^' + lineTerminator + ']*' +
          ')' +
          // (5) template literal
    '|' + '(' + '`(?:\\\\[\\s\\S]|[^`\\\\])*`' +
          ')' + literalSuffix +
          // (6) string literal
    '|' + '(' + '"(?:\\\\[\\s\\S]|[^"' + lineTerminator + '\\\\])*"' +
          '|' + "'(?:\\\\[\\s\\S]|[^'" + lineTerminator + "\\\\])*'" +
          ')' +
          // (7) regular expression literal
    '|' + '(' + (all ? regexpLiteral : whiteSpace) +
          ')' + literalSuffix +
          // (8) numeric literal
    '|' + '(' + '0(?:' + '[xX][0-9a-fA-F]+' +
                   '|' + '[oO][0-7]+' +
                   '|' + '[bB][01]+' +
                   ')' +
          '|' + '(?:\\d+(?:[.]\\d*)?|[.]\\d+)(?:[eE][+-]?\\d+)?' +
          '|' + '[1-9]\\d*' +
          '|' + '0[0-7]+' +
          ')' +
          // (9) operators
    '|' + '(' + punctuators +
          ')' +
          // (10) unicode character
    '|' + '(' + '\\\\u[0-9a-fA-F]{4}' +
          ')' +
    '|' + whiteSpace +
          // (11) line terminators
    '|' + '(' + lineTerminatorSequence + ')' +
          // (12) identifier
    '|' + '(' + '[^\\s+/%*=&|^~<>!?:;,.()[\\]{}\'"`-]+' +
          ')' +
    ')';
  }


  function parseMatches(match, tokens, options, ignoreRegExp) {
    for (var i = 1; i < capturedTokenLen; i++) {
      var value = match[i];
      if (!value) {
        continue;
      }

      var regex;
      var type = capturedToken[i];
      if (type === _Comment) {
        if (!options.comment) {
          break;
        }
      } else if (type === _LineTerminator) {
        if (!options.lineTerminator) {
          continue;
        }
      } else if (type === _Identifier) {
        if (value === 'null') {
          type = _Null;
        } else if (value === 'true' || value === 'false') {
          type = _Boolean;
        } else if (isKeyword(value)) {
          type = _Keyword;
        }
      } else if (type === _RegularExpression) {
        if (ignoreRegExp) {
          break;
        }
        regex = parseRegExpFlags(value);
      }

      var token = {
        type: type,
        value: value
      };

      if (regex) {
        token.regex = regex;
      }

      tokens[tokens.length] = token;

      if (value === match[0]) {
        break;
      }
    }
  }


  // Fix Regular Expression missing matches e.g. `var g=1,a=2/3/g;`
  function fixRegExpTokens(tokens, options) {
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== _RegularExpression) {
        continue;
      }

      var index = i;
      var regexToken = tokens[i];

      while (--index >= 0) {
        var token = tokens[index];
        var type = token.type;

        if (type === _Comment || type === _LineTerminator) {
          continue;
        }

        if ((type === _Punctuator || type === _Keyword) &&
            validRegExpPrefix.test(token.value)) {
          break;
        }

        var parts = parseRegExp(regexToken.value, options);
        Array.prototype.splice.apply(tokens, [i, 1].concat(parts));
        break;
      }
    }
  }


  function parseRegExpFlags(value) {
    var index = value.lastIndexOf('/');
    var flags = value.substring(index + 1);
    var pattern = value.substr(1, index - 1);

    return {
      pattern: pattern,
      flags: flags
    };
  }


  function parseRegExp(value, options) {
    var tokens = [];
    var m;

    while ((m = tokenizePattern.exec(value)) != null) {
      parseMatches(m, tokens, options, true);
    }

    return tokens;
  }


  function tokenize(code, options) {
    options = options || {};

    var tokens = [];
    var m;

    while ((m = tokenizePatternAll.exec(code)) != null) {
      parseMatches(m, tokens, options);
    }
    fixRegExpTokens(tokens, options);

    return tokens;
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


  function untokenize(tokens, options) {
    options = options || {};

    var results = [];
    var maxLineLen = options.maxLineLen || DEFAULT_MAXLINELEN;
    var lineLen = 0;
    var prev;

    for (var i = 0, len = tokens.length; i < len; prev = tokens[i++]) {
      var token = tokens[i];
      var next = tokens[i + 1];

      if (!prev) {
        if (token.type !== _LineTerminator) {
          results[results.length] = token.value;
        }
        continue;
      }

      var ws = '';
      if (token.type === _LineTerminator) {
        if (prev.type === _LineTerminator) {
          continue;
        }
        if (prev.type === _Punctuator || (next && next.type === _Punctuator)) {
          token.value = '';
        } else {
          lineLen = 0;
        }
      } else {
        if ((signRe.test(token.value.slice(-1)) && signRe.test(prev.value.charAt(0))) ||
            (identRe.test(prev.value.slice(-1)) && identRe.test(token.value.charAt(0)))) {
          ws = ' ';
        }

        if (token.type === _Punctuator && lineLen > maxLineLen) {
          token.value += '\n';
          lineLen = 0;
        }
      }

      var value = ws + token.value;
      lineLen += value.length;
      results[results.length] = value;
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


  function minify(code, options) {
    return untokenize(tokenize(code, { lineTerminator: true }), options);
  }

  /**
   * Minify JavaScript code.
   *
   * @param {string} code Target code.
   * @param {Object} [options] minify options.
   *   - maxLineLen: {number} (default=32000)
   *     Limit the line length in symbols.
   * @return {string} Return a minified code.
   */
  Chiffon.minify = minify;

  return Chiffon;
}));
