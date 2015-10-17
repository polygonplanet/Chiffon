/**
 * Chiffon
 *
 * @description  A very small ECMAScript parser, tokenizer and minifier written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minifier library
 * @version      1.4.0
 * @date         2015-10-18
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

  // ECMA-262 11.3 Line Terminators
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

  // ECMA-262 11.7 Punctuators
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

  var identToken = '[^\\s+/%*=&|^~<>!?:;,.()[\\]{}\'"`-]';

  // Valid keywords for Regular Expression Literal. e.g. `typeof /a/`
  var regexPreWords = 'typeof|in|void|case|instanceof|yield|throw|delete';
  // Valid keywords when previous token of the regex literal is a paren.
  // e.g. `if (1) /a/`
  var regexParenWords = 'if|while|for|with';

  var keywordsRe = new RegExp('^(?:' +
    // ECMA-262 11.6.2.1 Keywords
    regexParenWords + '|' + regexPreWords + '|' +
    'var|else|function|this|return|new|break|do|' +
    'catch|finally|try|default|continue|switch|' +
    'const|export|import|class|extends|debugger|super|' +
    // Reserved keywords
    'let|static|' +
    // ECMA-262 11.6.2.2 Future Reserved Words
    'enum|await|' +
    'implements|package|protected|interface|private|public' +
  ')$');

  var lineTerminatorSequenceRe = new RegExp(lineTerminatorSequence);

  var identLeftRe = new RegExp('^' + identToken);
  var identRightRe = new RegExp(identToken + '$');
  var signLeftRe = /^[+-]/;
  var signRightRe = /[+-]$/;

  var regexPrefixRe = new RegExp('(?:' +
          '(?:^(?:' + regexPreWords + ')$)' +
    '|' + '(?:' + '(?![.\\]])' + punctuators + '$)' +
  ')');
  var regexParenWordsRe = new RegExp('^(?:' + regexParenWords + ')$');

  var tokenizeRe = getPattern();
  var tokenizeAllRe = getPattern(true);

  function getPattern(all) {
    return new RegExp(
      '(?:' +
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
      '|' + '(' + identToken + '+' +
            ')' +
      ')',
      'g'
    );
  }

  var _line;
  var _prevLineIndex;
  var _regexParsing;
  var _currentRegexToken;
  var _options;


  function parseMatches(match, tokens) {
    var lineStart = _line;
    var lastIndex;
    if (_regexParsing) {
      lastIndex = _currentRegexToken._loc.rangeStart + tokenizeRe.lastIndex;
    } else {
      lastIndex = tokenizeAllRe.lastIndex;
    }

    for (var i = 1; i < capturedTokenLen; i++) {
      var value = match[i];
      if (!value) {
        continue;
      }

      var columnStart = lastIndex - value.length - _prevLineIndex;
      var regex;
      var type = capturedToken[i];

      if (type === _Comment) {
        if (value.charAt(1) === '*') {
          // multiline comment
          updateLine(value, lastIndex);
        }

        if (!_options.comment) {
          break;
        }
      } else if (type === _LineTerminator) {
        _line++;
        _prevLineIndex = lastIndex;

        if (!_options.lineTerminator) {
          continue;
        }
      } else if (type === _String || type === _Template) {
        updateLine(value, lastIndex);
      } else if (type === _Identifier) {
        if (value === 'null') {
          type = _Null;
        } else if (value === 'true' || value === 'false') {
          type = _Boolean;
        } else if (keywordsRe.test(value)) {
          type = _Keyword;
        }
      } else if (type === _RegularExpression) {
        if (_regexParsing) {
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

        // Regex is required additional information because of the mismatches.
        token._loc = {
          line: _line,
          rangeStart: lastIndex - value.length,
          prevLineIndex: _prevLineIndex
        };
      }

      if (_options.range) {
        token.range = [
          lastIndex - value.length,
          lastIndex
        ];
      }

      if (_options.loc) {
        token.loc = {
          start: {
            line: lineStart,
            column: columnStart
          },
          end: {
            line: _line,
            column: lastIndex - _prevLineIndex
          }
        };
      }

      tokens[tokens.length] = token;

      if (value === match[0]) {
        break;
      }
    }
  }


  function updateLine(value, lastIndex) {
    if (_options.loc) {
      var lines = value.split(lineTerminatorSequenceRe);
      if (lines.length > 1) {
        _line += lines.length - 1;
        _prevLineIndex = lastIndex - lines.pop().length;
      }
    }
  }


  // Fix Regular Expression missing matches e.g. `var g=1,a=2/3/g;`
  function fixRegExpTokens(tokens) {
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== _RegularExpression) {
        continue;
      }

      var index = i;
      var regexToken = tokens[i];
      var parsed;

      while (--index >= 0) {
        var token = tokens[index];
        var type = token.type;

        if (type === _Comment || type === _LineTerminator) {
          continue;
        }

        var value = token.value;
        if (type === _Punctuator) {
          if (value === ')') {
            if (isValidRegExpPrefix(tokens, index + 1)) {
              break;
            }
          } else if (regexPrefixRe.test(value)) {
            break;
          }
        } else if (type === _Keyword && regexPrefixRe.test(value)) {
          break;
        }

        var parts = parseRegExp(regexToken);
        Array.prototype.splice.apply(tokens, [i, 1].concat(parts));
        parsed = true;
        break;
      }

      if (!parsed) {
        delete regexToken._loc;
      }
    }
  }


  function isValidRegExpPrefix(tokens, i) {
    var level = 0;

    while (--i >= 0) {
      var token = tokens[i];
      var type = token.type;
      if (type !== _Punctuator) {
        continue;
      }

      var value = token.value;
      if (value === '(') {
        if (--level === 0) {
          var prevToken = tokens[i - 1];
          if (prevToken && prevToken.type === _Keyword &&
              regexParenWordsRe.test(prevToken.value)) {
            return true;
          }
          return false;
        }
      } else if (value === ')') {
        level++;
      }
    }

    return false;
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


  function parseRegExp(regexToken) {
    _currentRegexToken = regexToken;

    var value = regexToken.value;
    var tokens = [];
    var m;

    if (_options.loc) {
      _line = regexToken.loc.start.line;
      _prevLineIndex = regexToken._loc.prevLineIndex;
    }
    _regexParsing = true;

    tokenizeRe.lastIndex = 0;
    while ((m = tokenizeRe.exec(value)) != null) {
      parseMatches(m, tokens);
    }

    _regexParsing = false;
    _currentRegexToken = null;
    return tokens;
  }


  function tokenize(code, options) {
    code = '' + code;
    _options = options || {};

    var tokens = [];
    var m;

    _line = 1;
    _prevLineIndex = 0;
    _regexParsing = false;

    tokenizeAllRe.lastIndex = 0;
    while ((m = tokenizeAllRe.exec(code)) != null) {
      parseMatches(m, tokens);
    }

    fixRegExpTokens(tokens);
    _options = null;
    return tokens;
  }


  /**
   * Tokenize a string code.
   *
   * @param {string} code Target code.
   * @param {Object} [options] Tokenize options.
   *   - comment: {boolean} (default=false)
   *         Keep comment tokens.
   *   - lineTerminator: {boolean} (default=false)
   *         Keep line feed tokens.
   *   - range: {boolean} (default=false)
   *         Include an index-based location range (array)
   *   - loc: {boolean} (default=false)
   *         Include line number and column-based location info
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
      var tokenType = token.type;
      var tokenValue = token.value;
      var next = tokens[i + 1];

      if (!prev) {
        if (tokenType !== _LineTerminator) {
          results[results.length] = tokenValue;
        }
        continue;
      }

      var ws = '';
      var prevType = prev.type;
      var prevValue = prev.value;

      if (tokenType === _LineTerminator) {
        if (prevType === _LineTerminator) {
          continue;
        }
        if (prevType === _Punctuator || (next && next.type === _Punctuator)) {
          tokenValue = '';
        } else {
          lineLen = 0;
        }
      } else {
        if ((signLeftRe.test(tokenValue) && signRightRe.test(prevValue)) ||
            (identLeftRe.test(tokenValue) && identRightRe.test(prevValue))) {
          ws = ' ';
        }

        if (tokenType === _Punctuator && lineLen > maxLineLen) {
          tokenValue += '\n';
          lineLen = 0;
        }
      }

      var value = ws + tokenValue;
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
