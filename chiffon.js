/**
 * Chiffon
 *
 * @description  A very small ECMAScript parser, tokenizer and minifier written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minifier library
 * @version      1.6.5
 * @date         2015-10-29
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
  var fromCharCode = String.fromCharCode;

  var _Comment = 'Comment',
      _LineTerminator = 'LineTerminator',
      _Template = 'Template',
      _String = 'String',
      _Punctuator = 'Punctuator',
      _RegularExpression = 'RegularExpression',
      _Numeric = 'Numeric',
      _Identifier = 'Identifier',
      _Null = 'Null',
      _Boolean = 'Boolean',
      _Keyword = 'Keyword';

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
    '/' + '(?![*/])' +
          '(?:' + '\\\\[\\s\\S]' +
            '|' + '\\[' + '(?:' + '\\\\[\\s\\S]' +
                            '|' + '[^\\]' + lineTerminator + '\\\\]' +
                            ')*' +
                  '\\]' +
            '|' + '[^/' + lineTerminator + '\\\\]' +
            ')+' +
    '/' +
    '(?:[gimuy]+\\b|)' +
  ')';

  var templateLiteral = '`(?:' +
          '\\\\[\\s\\S]' +
    '|' + '[$][{]' + '(?:' + '\\\\[\\s\\S]' +
                       '|' + '[^{}\\\\]' +
                       '|' + '[{](?:[^{}]*(?:[{][^{}]*[}])?)*[}]' +
                       ')*' +
          '[}]' +
    '|' + '[^`\\\\]' +
    ')*`';

  var identToken = '(?:' +
        '\\\\u(?:[0-9a-fA-F]{4}|[{][0-9a-fA-F]+[}])' +
  '|' + '[^\\s\\\\+/%*=&|^~<>!?:;,.()[\\]{}\'"`@#-]' +
  ')+';

  // Valid keywords for Regular Expression Literal. e.g. `typeof /a/`
  var regexPreWords = 'typeof|in|void|case|instanceof|yield|throw|delete|' +
    'else|return|do';
  // Valid keywords when previous token of the regex literal is a paren.
  // e.g. `if (1) /a/`
  var regexParenWords = 'if|while|for|with';

  var keywordsRe = new RegExp('^(?:' +
    // ECMA-262 11.6.2.1 Keywords
    regexParenWords + '|' + regexPreWords + '|' +
    'var|function|this|new|break|catch|finally|try|default|continue|' +
    'switch|const|export|import|class|extends|debugger|super|' +
    // Reserved keywords
    'let|static|' +
    // ECMA-262 11.6.2.2 Future Reserved Words
    'enum|await|' +
    'implements|package|protected|interface|private|public' +
  ')$');

  var lineTerminatorSequenceRe = new RegExp(lineTerminatorSequence);

  var identRe = new RegExp('^' + identToken + '$');
  var identLeftRe = new RegExp('^' + identToken);
  var identRightRe = new RegExp(identToken + '$');
  var signLeftRe = /^[+-]/;
  var signRightRe = /[+-]$/;
  var notPunctRe = /[^{}()[\]<>=!+*%\/&|^~?:;,.-]/;
  var notDigitRe = /[^0-9]/;

  var whiteSpaceRe = new RegExp('^' + whiteSpace);
  var regexPrefixRe = new RegExp('(?:' +
          '(?:^(?:' + regexPreWords + ')$)' +
    '|' + '(?:' + '(?![.\\]])' + punctuators + '$)' +
  ')');
  var regexParenWordsRe = new RegExp('^(?:' + regexParenWords + ')$');

  var tokenizeNotTemplateRe = getPattern(_Template);
  var tokenizeNotRegExpRe = getPattern(_RegularExpression);
  var tokenizeRe = getPattern();

  lineTerminator =
  lineTerminatorSequence =
  whiteSpace =
  literalSuffix =
  punctuators =
  regexpLiteral =
  templateLiteral =
  identToken =
  regexPreWords =
  regexParenWords = null;


  function getPattern(ignore) {
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
      '|' + '(' + (ignore === _Template ? whiteSpace : templateLiteral) +
            ')' + literalSuffix +
            // (6) string literal
      '|' + '(' + '"(?:' + '\\\\\\r\\n' +
                     '|' + '\\\\[\\s\\S]' +
                     '|' + '[^"' + lineTerminator + '\\\\]' +
                   ')*"' +
            '|' + "'(?:" + '\\\\\\r\\n' +
                     '|' + '\\\\[\\s\\S]' +
                     '|' + "[^'" + lineTerminator + "\\\\]" +
                    ")*'" +
            ')' +
            // (7) regular expression literal
      '|' + '(' + (ignore === _RegularExpression ? whiteSpace : regexpLiteral) +
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
      '|' + '(' + punctuators + ')' +
      '|' + whiteSpace +
            // (10) line terminators
      '|' + '(' + lineTerminatorSequence + ')' +
            // (11) identifier
      '|' + '(' + (ignore === _Template ? '[\\s\\S]' : identToken) +
            ')' +
      ')',
      'g'
    );
  }


  function isLineTerminator(c) {
    return c === 0x0A || c === 0x0D || c === 0x2028 || c === 0x2029;
  }


  function isPunctuator(c) {
    return !notPunctRe.test(c);
  }


  function isDigit(c) {
    return !notDigitRe.test(c);
  }


  function mixin(target) {
    slice.call(arguments, 1).forEach(function(source) {
      var keys = Object.keys(source);
      for (var i = 0, len = keys.length; i < len; i++) {
        var key = keys[i];
        target[key] = source[key];
      }
    });
    return target;
  }


  function Tokenizer(options) {
    this.options = mixin({}, options || {});
    this.line = 1;
    this.index = 0;
    this.prevLineIndex = 0;
  }

  Tokenizer.prototype = {
    parseMatches: function(matches, tokens) {
      var token, value, len, index, lines, range, loc;
      var lineStart, columnStart, columnEnd, hasLineTerminator;
      var type, regex, ch, c;

      for (var i = 0; i < matches.length; i++) {
        value = matches[i];
        len = value.length;
        if (len === 0) {
          continue;
        }

        lineStart = this.line;
        columnStart = this.index - this.prevLineIndex;

        regex = null;
        type = this.getTokenType(value);

        if (type === _String ||
            (type === _Comment && value.charAt(1) === '*')) {
          if (this.options.loc) {
            lines = value.split(lineTerminatorSequenceRe);
            if (lines.length > 1) {
              this.line += lines.length - 1;
              this.prevLineIndex = this.index + len - lines.pop().length;
            }
          }
        } else if (type === _LineTerminator) {
          this.line++;
          this.prevLineIndex = this.index + len;
        } else if (type === _RegularExpression) {
          if (this.fixRegExpTokens(matches, i, tokens, value)) {
            i--;
            continue;
          }
          index = value.lastIndexOf('/');
          regex = {
            pattern: value.substr(1, index - 1),
            flags: value.substring(index + 1)
          };
        } else if (type === _Template) {
          this.parseTemplate(value, tokens, columnStart);
          continue;
        }

        this.index += len;

        if (this.options.parse && type === _LineTerminator) {
          hasLineTerminator = true;
          continue;
        }

        if ((type === _Comment && !this.options.comment) ||
            (type === _LineTerminator && !this.options.lineTerminator)) {
          continue;
        }

        if (type) {
          token = {
            type: type,
            value: value
          };

          if (hasLineTerminator) {
            token.hasLineTerminator = true;
          }
          hasLineTerminator = false;

          if (regex) {
            token.regex = regex;
          }

          if (this.options.range) {
            token.range = [this.index - len, this.index];
          }
          if (this.options.loc) {
            columnEnd = this.index - this.prevLineIndex;
            this.addLoc(token, lineStart, columnStart, this.line, columnEnd);
          }

          tokens[tokens.length] = token;
        }
      }
    },
    getTokenType: function(value) {
      var len = value.length;
      var c = value.charAt(0);
      var ch;

      switch (c) {
        case '"':
        case "'":
          return _String;
        case '/':
          if (len === 1) {
            return _Punctuator;
          }

          c = value.charAt(1);
          if (c === '/' || c === '*') {
            return _Comment;
          }
          if (len === 2 && c === '=') {
            return _Punctuator;
          }
          return _RegularExpression;
        case '.':
          if (len === 1) {
            return _Punctuator;
          }

          c = value.charAt(1);
          if (c === '.') {
            return _Punctuator;
          }
          return _Numeric;
        case '<':
          if (len > 1 && value.charAt(1) === '!') {
            return _Comment;
          }
          return _Punctuator;
        case '-':
          if (len < 3) {
            return _Punctuator;
          }
          return _Comment;
        case '`':
          return _Template;
        case '}':
          if (len === 1) {
            return _Punctuator;
          }
          return _Template;
        default:
          if (value === 'true' || value === 'false') {
            return _Boolean;
          }
          if (value === 'null') {
            return _Null;
          }

          ch = c.charCodeAt(0);
          if (ch === 0x20 || ch === 0x09 || whiteSpaceRe.test(c)) {
            return;
          }

          if (isLineTerminator(ch)) {
            return _LineTerminator;
          }
          if (isPunctuator(c)) {
            return _Punctuator;
          }
          if (isDigit(c)) {
            return _Numeric;
          }

          if (keywordsRe.test(value)) {
            return _Keyword;
          }
          if (identRe.test(value)) {
            return _Identifier;
          }
      }
    },
    addLoc: function(token, lineStart, columnStart, lineEnd, columnEnd) {
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
    },
    parseTemplate: function(template, tokens, columnStart) {
      var blocks = this.parseTemplateBlock(template, columnStart);
      var newTokens = this.parseTemplateExpr(blocks);
      push.apply(tokens, newTokens);
    },
    parseTemplateExpr: function(blocks) {
      var results = [];

      for (var i = 0, len = blocks.length; i < len; i++) {
        var block = blocks[i];
        if (block.type === 'tmp-source') {
          var props = mixin({}, block._loc, { type: _Template });
          var tokens = this._retokenize(block.value, props);
          push.apply(results, tokens);
        } else {
          results[results.length] = block;
        }
      }

      return results;
    },
    parseTemplateBlock: function(template, columnStart) {
      var values = template.match(tokenizeNotTemplateRe);

      var line = this.line;
      var lineStart = line;
      var rangeStart = this.index;
      var newlines = [this.prevLineIndex];

      var tokens = [];
      var escapeCount = 0;
      var value = '';
      var type = _Template;

      var braceLevel = 0;
      var length = 0;

      var lastIndex, prevLineIndex, columnEnd;
      var prev, inExpr, tail, append, token;

      for (var i = 0, len = values.length; i < len; prev = values[i++]) {
        var c = values[i];
        var cLen = c.length;

        if (isLineTerminator(c.charCodeAt(0))) {
          line++;
          newlines[newlines.length] = rangeStart + length + cLen;
        }

        if (inExpr) {
          switch (c) {
            case '{':
              braceLevel++;
              break;
            case '}':
              braceLevel--;
              break;
          }

          if (braceLevel === 0 && i + 1 < len && values[i + 1] === '}') {
            append = true;
            type = 'tmp-source'; // Temporary token type
            inExpr = false;
          }
        } else if (c === '\\') {
          if (prev === '\\') {
            escapeCount++;
          } else {
            escapeCount = 1;
          }
        } else if (c === '$') {
          tail = (prev !== '\\' || escapeCount % 2 === 0);
        } else if (c === '{') {
          if (tail && prev === '$') {
            append = true;
            type = _Template;
            inExpr = true;
          }
        }

        value += c;

        if (i === len - 1) {
          append = true;
          type = _Template;
        }

        if (append) {
          token = {
            type: type,
            value: value
          };

          lastIndex = rangeStart + length + cLen;
          prevLineIndex = this.findPrevLineIndex(newlines, lastIndex);
          columnEnd = lastIndex - prevLineIndex;

          if (type === _Template) {
            if (this.options.range) {
              token.range = [lastIndex - value.length, lastIndex];
            }
            if (this.options.loc) {
              this.addLoc(token, lineStart, columnStart, line, columnEnd);
            }
            columnStart = columnEnd + cLen;
          } else {
            lastIndex = rangeStart + length + cLen - value.length;
            prevLineIndex = this.findPrevLineIndex(newlines, lastIndex);

            token._loc = {
              line: lineStart,
              index: lastIndex,
              prevLineIndex: prevLineIndex
            };
            columnStart = columnEnd;
          }

          tokens[tokens.length] = token;
          value = '';
          lineStart = line;
          append = false;
        }

        length += cLen;
      }

      this.line = lineStart;
      this.index = lastIndex;
      this.prevLineIndex = prevLineIndex;

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
    fixRegExpTokens: function(matches, index, tokens, regexValue) {
      var i = tokens.length;

      while (--i >= 0) {
        var token = tokens[i];
        var type = token.type;

        if (type === _Comment || type === _LineTerminator) {
          continue;
        }

        var value = token.value;
        if (type === _Punctuator) {
          if (value === ')') {
            if (this.isValidRegExpPrefix(tokens, i + 1)) {
              break;
            }
          } else if (regexPrefixRe.test(value)) {
            break;
          }
        } else if ((type === _Keyword && regexPrefixRe.test(value)) ||
                   (type === _Template && value.slice(-2) === '${')) {
          break;
        }

        var parts = regexValue.match(tokenizeNotRegExpRe);
        splice.apply(matches, [index, 1].concat(parts));
        return true;
      }
      return false;
    },
    isValidRegExpPrefix: function(tokens, i) {
      var token, value, prev;
      var level = 0;

      while (--i >= 0) {
        token = tokens[i];
        if (token.type !== _Punctuator) {
          continue;
        }

        value = token.value;
        if (value === '(') {
          if (--level === 0) {
            prev = tokens[i - 1];
            if (prev && prev.type === _Keyword &&
                regexParenWordsRe.test(prev.value)) {
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
    _retokenize: function(source, props) {
      var tokenizer = new Tokenizer(this.options);
      mixin(tokenizer, props);
      return tokenizer.tokenize(source);
    },
    tokenize: function(source) {
      if (source == null) {
        return [];
      }
      source = '' + source;

      var tokens = [];
      var matches = source.match(tokenizeRe);
      if (matches) {
        this.parseMatches(matches, tokens);
      }

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


  function Untokenizer(options) {
    this.options = mixin({}, options || {});
  }

  Untokenizer.prototype = {
    untokenize: function(tokens) {
      var results = [];
      var prev;

      for (var i = 0, len = tokens.length; i < len; prev = tokens[i++]) {
        var token = tokens[i];
        var tokenType = token.type;
        var tokenValue = token.value;

        if (!prev) {
          results[results.length] = tokenValue;
          continue;
        }

        var ws;
        var prevType = prev.type;
        var prevValue = prev.value;

        if (tokenType === _Punctuator) {
          ws = signLeftRe.test(tokenValue) && signRightRe.test(prevValue);
        } else {
          ws = identLeftRe.test(tokenValue) && identRightRe.test(prevValue);
        }

        results[results.length] = (ws ? ' ' : '') + tokenValue;
      }

      return results.join('');
    }
  };

  /**
   * Concatenate to string from the parsed tokens.
   *
   * @param {Array} tokens An array of the parsed tokens.
   * @return {string} Return a concatenated string.
   */
  var untokenize = Chiffon.untokenize = function(tokens, options) {
    return new Untokenizer(options).untokenize(tokens);
  };


  var TOKEN_END = {};
  var minifyDefaultOptions = {
    maxLineLen: 32000
  };

  function Minifier(options) {
    this.options = mixin({}, options || {}, minifyDefaultOptions);
  }

  Minifier.prototype = {
    init: function() {
      this.index = 0;
      this.lineLen = 0;
      this.current();
    },
    next: function() {
      this.index++;
      return this.current();
    },
    current: function() {
      this.length = this.tokens.length;
      this.prev = this.tokens[this.index - 1] || {};
      this.token = this.tokens[this.index] || TOKEN_END;
      this.value = this.token.value;
      this.type = this.token.type;
      this.lookahead = this.tokens[this.index + 1] || TOKEN_END;
      return this.token;
    },
    remove: function(index) {
      if (index == null) {
        index = this.index;
      }
      this.tokens.splice(index, 1);
      this.current();
    },
    insert: function(token) {
      this.tokens.splice(this.index + 1, 0, token);
      this.next();
    },
    eat: function(type) {
      type = type || _LineTerminator;

      while (this.type === type) {
        this.remove();
      }
    },
    flatten: function() {
      this.init();
      this.eat();

      while (this.index < this.length) {
        if (this.type === _LineTerminator) {
          if (this.prev.type === _Punctuator ||
              this.prev.type === _LineTerminator ||
              this.lookahead.type === _Punctuator) {
            this.eat();
            continue;
          } else if (this.lookahead.type === _LineTerminator) {
            this.next();
            this.eat();
            continue;
          }
        }
        this.next();
      }
    },
    breakLine: function() {
      this.init();

      while (this.index < this.length) {
        if (this.type === _LineTerminator) {
          this.lineLen = 0;
        } else {
          this.lineLen += this.value.length;
          if (this.lineLen >= this.options.maxLineLen) {
            if (this.type === _Punctuator && !signRightRe.test(this.value)) {
              this.insert({
                type: _LineTerminator,
                value: '\n'
              });
              this.lineLen = 0;
            }
          }
        }
        this.next();
      }
    },
    compress: function() {
      this.flatten();
      this.breakLine();
    },
    minify: function(source) {
      this.tokens = tokenize(source, { lineTerminator: true });
      this.init();
      this.compress();
      return untokenize(this.tokens);
    }
  };

  /**
   * Minify JavaScript source.
   *
   * @param {string} source Target source.
   * @param {Object} [options] minify options.
   *   - maxLineLen: {number} (default=32000)
   *     Limit the line length in symbols.
   * @return {string} Return a minified source.
   */
  var minify = Chiffon.minify = function(source, options) {
    return new Minifier(options).minify(source);
  };

  return Chiffon;
}));
