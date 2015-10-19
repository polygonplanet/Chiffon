/**
 * Chiffon
 *
 * @description  A very small ECMAScript parser, tokenizer and minifier written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minifier library
 * @version      1.5.0
 * @date         2015-10-20
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

  var arrayProto = Array.prototype;
  var objectProto = Object.prototype;
  var push = arrayProto.push;
  var slice = arrayProto.slice;
  var splice = arrayProto.splice;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var fromCharCode = String.fromCharCode;


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


  function isLineTerminator(c) {
    return c === 0x0A || c === 0x0D || c === 0x2028 || c === 0x2029;
  }


  function mixin(target) {
    var sources = slice.call(arguments, 1);
    for (var i = 0, len = sources.length; i < len; i++) {
      var source = sources[i];
      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }


  var _retokenize;

  function Tokenizer(options) {
    this.options = mixin({}, options || {});
  }

  Tokenizer.prototype = {
    parseMatches: function(match, tokens) {
      var lineStart = this.line;
      var lastIndex;
      if (this.regexParsing) {
        lastIndex = this._currentRegexToken._loc.rangeStart + tokenizeRe.lastIndex;
      } else {
        lastIndex = tokenizeAllRe.lastIndex;
        if (_retokenize) {
          lastIndex += this.rangeStart;
        }
      }

      for (var i = 1; i < capturedTokenLen; i++) {
        var value = match[i];
        if (!value) {
          continue;
        }

        var columnStart = lastIndex - value.length - this.prevLineIndex;
        var regex, addLoc;
        var type = capturedToken[i];

        if (type === _Comment) {
          if (value.charAt(1) === '*') {
            // multiline comment
            this.updateLine(value, lastIndex);
          }

          if (!this.options.comment) {
            break;
          }
        } else if (type === _LineTerminator) {
          this.line++;
          this.prevLineIndex = lastIndex;

          if (!this.options.lineTerminator) {
            continue;
          }
        } else if (type === _String) {
          this.updateLine(value, lastIndex);
        } else if (type === _Template) {
          addLoc = true;
        } else if (type === _Identifier) {
          if (value === 'null') {
            type = _Null;
          } else if (value === 'true' || value === 'false') {
            type = _Boolean;
          } else if (keywordsRe.test(value)) {
            type = _Keyword;
          }
        } else if (type === _RegularExpression) {
          if (this.regexParsing) {
            break;
          }
          addLoc = true;
          regex = this.parseRegExpFlags(value);
        }

        var token = {
          type: type,
          value: value
        };

        if (regex) {
          token.regex = regex;
        }

        if (addLoc) {
          // Regex is required additional information because of the mismatches.
          token._loc = {
            line: this.line,
            columnStart: columnStart,
            rangeStart: lastIndex - value.length,
            prevLineIndex: this.prevLineIndex
          };
        }

        if (type === _Template) {
          this.updateLine(value, lastIndex);
        }

        var columnEnd = lastIndex - this.prevLineIndex;
        this.addRange(token, lastIndex);
        this.addLoc(token, lineStart, columnStart, this.line, columnEnd);

        tokens[tokens.length] = token;

        if (value === match[0]) {
          break;
        }
      }
    },
    addRange: function(token, lastIndex) {
      if (this.options.range) {
        token.range = [
          lastIndex - token.value.length,
          lastIndex
        ];
      }
    },
    addLoc: function(token, lineStart, columnStart, lineEnd, columnEnd) {
      if (this.options.loc) {
        token.loc = {
          start: {
            line: lineStart,
            column: columnStart
          },
          end: {
            line: lineEnd,
            column: columnEnd
          }
        };
      }
    },
    updateLine: function(value, lastIndex) {
      if (this.options.loc) {
        var lines = value.split(lineTerminatorSequenceRe);
        if (lines.length > 1) {
          this.line += lines.length - 1;
          this.prevLineIndex = lastIndex - lines.pop().length;
        }
      }
    },
    parseTemplate: function(tokens) {
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token.type !== _Template) {
          continue;
        }

        var blocks = this.parseTemplateBlock(token);
        var newTokens = this.parseTemplateExpr(blocks, token);
        splice.apply(tokens, [i, 1].concat(newTokens));
        i += newTokens.length;
      }
    },
    parseTemplateExpr: function(blocks, templateToken) {
      var results = [];

      for (var i = 0, len = blocks.length; i < len; i++) {
        var block = blocks[i];
        if (block.type === 'tmp-source') {
          _retokenize = mixin({}, block._loc, { type: _Template });
          var tokens = tokenize(block.value, this.options);
          _retokenize = null;
          push.apply(results, tokens);
        } else {
          results[results.length] = block;
        }
      }

      return results;
    },
    parseTemplateBlock: function(templateToken) {
      var value = templateToken.value;
      var loc = templateToken._loc;

      var line = loc.line;
      var lineStart = line;
      var columnStart = loc.columnStart;
      var rangeStart = loc.rangeStart;
      var newlines = [loc.prevLineIndex];

      var tokens = [];
      var escapeCount = 0;
      var s = '';
      var type = _Template;

      var lastIndex, prevLineIndex, columnEnd;
      var prev, inExpr, tail, append, token;

      for (var i = 0, len = value.length; i < len; prev = value.charCodeAt(i++)) {
        var c = value.charCodeAt(i);

        if (isLineTerminator(c)) {
          if (prev === 0x0D && c === 0x0A) {
            line--;
          }
          line++;
          newlines[newlines.length] = rangeStart + i + 1;
        }

        if (inExpr) {
          if (i + 1 < len && value.charCodeAt(i + 1) === 0x7D) { // '}'
            append = true;
            type = 'tmp-source'; // Temporary token type
            inExpr = false;
          }
        } else if (c === 0x5C) { // '\'
          if (prev === 0x5C) {
            escapeCount++;
          } else {
            escapeCount = 1;
          }
        } else if (c === 0x24) { // '$'
          tail = (prev !== 0x5C || escapeCount % 2 === 0);
        } else if (c === 0x7B) { // '{'
          if (tail && prev === 0x24) {
            append = true;
            type = _Template;
            inExpr = true;
          }
        }

        s += fromCharCode(c);

        if (i === len - 1) {
          append = true;
          type = _Template;
        }

        if (append) {
          token = {
            type: type,
            value: s
          };

          lastIndex = rangeStart + i + 1;
          prevLineIndex = this.findPrevLineIndex(newlines, lastIndex);
          columnEnd = lastIndex - prevLineIndex;

          if (type === _Template) {
            this.addRange(token, lastIndex);
            this.addLoc(token, lineStart, columnStart, line, columnEnd);
            columnStart = columnEnd + 1;
          } else {
            lastIndex = rangeStart + i + 1 - s.length;
            prevLineIndex = this.findPrevLineIndex(newlines, lastIndex);

            token._loc = {
              line: lineStart,
              rangeStart: lastIndex,
              prevLineIndex: prevLineIndex
            };
            columnStart = columnEnd;
          }

          tokens[tokens.length] = token;
          s = '';
          lineStart = line;
          append = false;
        }
      }

      return tokens;
    },
    findPrevLineIndex: function(newlines, lastIndex) {
      for (var i = newlines.length - 1; i >= 0; --i) {
        var newline = newlines[i];
        if (lastIndex >= newline) {
          return newline;
        }
      }
    },
    // Fix Regular Expression missing matches e.g. `var g=1,a=2/3/g;`
    fixRegExpTokens: function(tokens) {
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
              if (this.isValidRegExpPrefix(tokens, index + 1)) {
                break;
              }
            } else if (regexPrefixRe.test(value)) {
              break;
            }
          } else if ((type === _Keyword && regexPrefixRe.test(value)) ||
                     (type === _Template && value.slice(-2) === '${')) {
            break;
          }

          var parts = this.parseRegExp(regexToken);
          splice.apply(tokens, [i, 1].concat(parts));
          parsed = true;
          break;
        }

        if (!parsed) {
          delete regexToken._loc;
        }
      }
    },
    isValidRegExpPrefix: function(tokens, i) {
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
    },
    parseRegExpFlags: function(value) {
      var index = value.lastIndexOf('/');
      var flags = value.substring(index + 1);
      var pattern = value.substr(1, index - 1);

      return {
        pattern: pattern,
        flags: flags
      };
    },
    parseRegExp: function(regexToken) {
      this._currentRegexToken = regexToken;

      var value = regexToken.value;
      var tokens = [];
      var m;

      if (this.options.loc) {
        this.line = regexToken.loc.start.line;
        this.prevLineIndex = regexToken._loc.prevLineIndex;
      }
      this.regexParsing = true;

      tokenizeRe.lastIndex = 0;
      while ((m = tokenizeRe.exec(value)) != null) {
        this.parseMatches(m, tokens);
      }

      this.regexParsing = false;
      this._currentRegexToken = null;
      return tokens;
    },
    tokenize: function(source) {
      source = '' + source;

      if (_retokenize) {
        // Recursive internal call.
        mixin(this, _retokenize);
      } else {
        this.line = 1;
        this.prevLineIndex = 0;
      }
      this.regexParsing = false;

      var tokens = [];
      var m;

      tokenizeAllRe.lastIndex = 0;
      while ((m = tokenizeAllRe.exec(source)) != null) {
        this.parseMatches(m, tokens);
      }

      if (!_retokenize || _retokenize.type !== _Template) {
        this.parseTemplate(tokens);
      }
      this.fixRegExpTokens(tokens);

      return tokens;
    }
  };

  /**
   * Tokenize a string source.
   *
   * @param {string} source Target source.
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
  var tokenize = Chiffon.tokenize = function(source, options) {
    return new Tokenizer(options).tokenize(source);
  };


  function untokenize(tokens, options) {
    options = mixin({}, options || {});

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


  function minify(source, options) {
    return untokenize(tokenize(source, { lineTerminator: true }), options);
  }

  /**
   * Minify JavaScript source.
   *
   * @param {string} source Target source.
   * @param {Object} [options] minify options.
   *   - maxLineLen: {number} (default=32000)
   *     Limit the line length in symbols.
   * @return {string} Return a minified source.
   */
  Chiffon.minify = minify;

  return Chiffon;
}));
