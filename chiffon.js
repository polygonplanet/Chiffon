/**
 * Chiffon
 *
 * @description  A small ECMAScript parser, tokenizer and minifier written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minifier library
 * @version      2.5.4
 * @date         2016-04-17
 * @link         https://github.com/polygonplanet/Chiffon
 * @copyright    Copyright (c) 2015-2026 polygonplanet <polygon.planet.aqua@gmail.com>
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
  var push = arrayProto.push;
  var slice = arrayProto.slice;
  var splice = arrayProto.splice;
  var fromCharCode = String.fromCharCode;
  var hasBigInt = typeof BigInt === 'function';

  var _Comment = 'Comment',
      _WhiteSpace = 'WhiteSpace',
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

  // ECMA-262, 16th: 12.3 Line Terminators
  var lineTerminator = '\\r\\n\\u2028\\u2029';
  var lineTerminatorSequence = '(?:\\r\\n|[' + lineTerminator + '])';
  var whiteSpace = '(?:(?![' + lineTerminator + '])\\s)+';

  var literalSuffix = '(?=' +
    '\\s*' +
    '(?:' + '(?!\\s*[/\\\\<>*%`^"\'\\w$-])' +
            '[^/\\\\<>*%`^\'"({[\\w$-]' +
      '|' + '[!=]==?' +
      '|' + '[|][|]' +
      '|' + '&&' +
      '|' + '/[*/]' +
      '|' + '[,.;:!?)}\\]' + lineTerminator + ']' +
      '|' + '$' +
    ')' +
  ')';

  // ECMA-262, 16th: 12.8 Punctuators
  // Must be ordered from longest to shortest to ensure correct matching.
  var punctuators = '(?:' +
          '>>>=?|[.]{3}|<<=|===|!==|>>=|[*][*]=' +
    '|' + '[+][+](?=[+])|--(?=-)' +
    '|' + '[=!<>*%+/&|^-]=' +
    '|' + '&&|[|][|]|[+][+]|--|[*][*]|<<|>>|=>|[?][?]' +
    // ES2020 Optional Chaining `?.` (lookahead is not DecimalDigit)
    '|' + '[?][.](?![0-9])' +
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
    '(?:[dgimsuvy]+\\b|)' +
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

  // Keywords that can come before a Regular Expression Literal. e.g., `typeof /a/`
  // `await` is included because `await /a/;` is valid syntax inside an
  // async context, where the `/` starts a regular expression literal.
  var regexPrefixKeywords = 'typeof|in|void|case|instanceof|yield|throw|delete|' +
    'else|return|do|await';
  // Keywords that allow a Regex Literal immediately after a closing
  // parenthesis. e.g., `if (1) /a/`
  var regexParenKeywords = 'if|while|for|with';

  // Reserved Words
  var keywordsRe = new RegExp('^(?:' +
    regexParenKeywords + '|' + regexPrefixKeywords + '|' +
    'var|function|this|new|break|catch|finally|try|default|continue|' +
    'switch|const|export|import|class|extends|debugger|super|enum|' +

    // ECMA-262, 16th: 12.7.2 Keywords and Reserved Words
    // Contextually disallowed as identifiers, in strict mode code:
    // `await` is listed in `regexPrefixKeywords` above because ECMA-262
    // includes it in the ReservedWord production; it is reserved only inside
    // async contexts and modules, but otherwise may be used as an identifier.
    'let|static|' +
    'implements|package|protected|interface|private|public' +
  ')$');

  var lineTerminatorSequenceRe = new RegExp(lineTerminatorSequence);

  var identRe = new RegExp('^' + identToken + '$');
  var identLeftRe = new RegExp('^' + identToken);
  var identRightRe = new RegExp(identToken + '$');
  var signLeftRe = /^[+-]/;
  var signRightRe = /[+-]$/;
  var notPunctRe = /[^{}()[\]<>=!+*%\/&|^~?:;,.-]/;

  var whiteSpaceRe = new RegExp('^' + whiteSpace);
  var regexPrefixRe = new RegExp('(?:' +
          '(?:^(?:' + regexPrefixKeywords + ')$)' +
    '|' + '(?:' + '(?![.\\]])' + punctuators + '$)' +
  ')');
  var regexParenKeywordsRe = new RegExp('^(?:' + regexParenKeywords + ')$');

  var tokenizeNotWhiteSpaceRe = getPattern(_WhiteSpace);
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
  regexPrefixKeywords =
  regexParenKeywords = null;


  function getPattern(ignore) {
    return new RegExp(
      '(' +
            // MultiLine Comment
            '/[*][\\s\\S]*?[*]/' +

            // SingleLine Comment
      '|' + '//[^' + lineTerminator + ']*' +
      '|' + '<!--[^' + lineTerminator + ']*' +

            // Line Terminators
      '|' + '(?:^|' + lineTerminatorSequence + ')' +
            '(?:' + whiteSpace + ')?' +
            // SingleLine Comment
            '-->[^' + lineTerminator + ']*' +

            // Template Literal
      (ignore === _Template ? '' :
        '|' + templateLiteral + literalSuffix) +

            // String Literal
            // ES2019 JSON superset: raw U+2028/U+2029 are allowed inside
            // string literals, so only \r and \n are excluded here.
      '|' + '"(?:' + '\\\\\\r\\n' +
               '|' + '\\\\[\\s\\S]' +
               '|' + '[^"\\r\\n\\\\]' +
               ')*"' +
      '|' + "'(?:" + '\\\\\\r\\n' +
               '|' + '\\\\[\\s\\S]' +
               '|' + "[^'\\r\\n\\\\]" +
               ")*'" +

            // Regular Expression Literal
      (ignore === _RegularExpression ? '' :
        '|' + regexpLiteral + literalSuffix) +

      // ECMA-262, 16th: 12.9.3 Numeric Literals (with BigInt and Numeric Separators)
      '|' + '0(?:' + '[xX][0-9a-fA-F](?:_?[0-9a-fA-F]+)*' +
               '|' + '[oO][0-7](?:_?[0-7]+)*' +
               '|' + '[bB][01](?:_?[01]+)*' +
               ')n?' + // BigIntLiteralSuffix
      '|' + '(?:0|[1-9](?:_?\\d+)*)n' +
      '|' + '(?:' + '\\d(?:_?\\d+)*(?:[.](?:\\d(?:_?\\d+)*)?)?' +
              '|' + '[.]\\d(?:_?\\d+)*' +
              ')' + '(?:[eE][+-]?\\d(?:_?\\d+)*)?' +
      '|' + '[1-9](?:_?\\d+)*' +
      '|' + '0[0-7]+' +

            // Operators
      '|' + punctuators +

            // WhiteSpace
      (ignore === _WhiteSpace ? '' :
        '|' + whiteSpace) +

            // Line Terminators
      '|' + lineTerminatorSequence +

            // Identifier
      '|' + (ignore === _Template ? '[\\s\\S]' : identToken) +
      ')',
      'g'
    );
  }

  function fromCodePoint(c) {
    if (c <= 0xFFFF) {
      return fromCharCode(c);
    }
    c -= 0x10000;
    return fromCharCode((c >> 10) + 0xD800, (c % 0x400) + 0xDC00);
  }


  function isLineTerminator(c) {
    return c === 0x0A || c === 0x0D || c === 0x2028 || c === 0x2029;
  }


  function isPunctuator(c) {
    return !notPunctRe.test(c);
  }


  function isDigit(c) {
    return c >= 0x30 && c <= 0x39;
  }


  function isOctalDigit(c) {
    var ch = c.charCodeAt(0);
    return ch >= 0x30 && ch <= 0x37;
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
      var token, value, len, index, lines;
      var lineStart, columnStart, columnEnd, hasLineTerminator;
      var type, regex;
      var options = this.options;

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

        if (options.loc) {
          if (type === _String ||
              (type === _Comment && value.charAt(1) === '*')) {
            lines = value.split(lineTerminatorSequenceRe);
            if (lines.length > 1) {
              this.line += lines.length - 1;
              this.prevLineIndex = this.index + len - lines.pop().length;
            }
          } else if (type === _LineTerminator) {
            this.line++;
            this.prevLineIndex = this.index + len;
          }
        }

        if (type === _RegularExpression) {
          if (this.resolveRegExpMatch(matches, i, tokens, value)) {
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

        if (!type) {
          continue;
        }

        if (options.parse && type === _LineTerminator) {
          hasLineTerminator = true;
          continue;
        }

        if ((type === _Comment && !options.comment) ||
            (type === _WhiteSpace && !options.whiteSpace) ||
            (type === _LineTerminator && !options.lineTerminator)) {
          continue;
        }

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

        if (options.range) {
          token.range = [this.index - len, this.index];
        }
        if (options.loc) {
          columnEnd = this.index - this.prevLineIndex;
          this.addLoc(token, lineStart, columnStart, this.line, columnEnd);
        }

        tokens[tokens.length] = token;
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
          if (whiteSpaceRe.test(c)) {
            return _WhiteSpace;
          }
          if (isPunctuator(c)) {
            return _Punctuator;
          }

          ch = c.charCodeAt(0);
          if (isLineTerminator(ch)) {
            return _LineTerminator;
          }
          if (isDigit(ch)) {
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
    // Resolve the `/` regex/division ambiguity by looking behind at the
    // preceding token. e.g. `var g=1,a=2/3/g;` is divisions, not a regex.
    resolveRegExpMatch: function(matches, matchIndex, tokens, regexValue) {
      var i = tokens.length;

      while (--i >= 0) {
        var token = tokens[i];
        var type = token.type;

        if (type === _Comment ||
            type === _WhiteSpace ||
            type === _LineTerminator) {
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
        splice.apply(matches, [matchIndex, 1].concat(parts));
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
                regexParenKeywordsRe.test(prev.value)) {
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

      var options = this.options;
      var re;
      if (options.whiteSpace || options.range || options.loc) {
        re = tokenizeRe;
      } else {
        re = tokenizeNotWhiteSpaceRe;
      }

      var tokens = [];
      var matches = source.match(re);
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

        if (!prev || this.options.unsafe) {
          results[results.length] = tokenValue;
          continue;
        }

        var ws;
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
   * @param {Object} [options] Untokenize options.
   *  - unsafe: {boolean} (default=false)
   *    Untokenizer does not add a space between the identifier and identifier.
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


  // Parser based Esprima. (http://esprima.org/)
  // Abstract syntax tree specified by ESTree. (https://github.com/estree/estree)
  var _AssignmentExpression = 'AssignmentExpression',
      _AssignmentPattern = 'AssignmentPattern',
      _ArrayExpression = 'ArrayExpression',
      _ArrayPattern = 'ArrayPattern',
      _ArrowFunctionExpression = 'ArrowFunctionExpression',
      _ArrowParameters = 'ArrowParameters',
      _AwaitExpression = 'AwaitExpression',
      _BlockStatement = 'BlockStatement',
      _BinaryExpression = 'BinaryExpression',
      _BreakStatement = 'BreakStatement',
      _CallExpression = 'CallExpression',
      _CatchClause = 'CatchClause',
      _ChainExpression = 'ChainExpression',
      _ClassBody = 'ClassBody',
      _ClassDeclaration = 'ClassDeclaration',
      _ClassExpression = 'ClassExpression',
      _ConditionalExpression = 'ConditionalExpression',
      _ContinueStatement = 'ContinueStatement',
      _DoWhileStatement = 'DoWhileStatement',
      _DebuggerStatement = 'DebuggerStatement',
      _EmptyStatement = 'EmptyStatement',
      _ExportAllDeclaration = 'ExportAllDeclaration',
      _ExportDefaultDeclaration = 'ExportDefaultDeclaration',
      _ExportNamedDeclaration = 'ExportNamedDeclaration',
      _ExportSpecifier = 'ExportSpecifier',
      _ExpressionStatement = 'ExpressionStatement',
      _ForStatement = 'ForStatement',
      _ForOfStatement = 'ForOfStatement',
      _ForInStatement = 'ForInStatement',
      _FunctionDeclaration = 'FunctionDeclaration',
      _FunctionExpression = 'FunctionExpression',
      _IfStatement = 'IfStatement',
      _ImportDeclaration = 'ImportDeclaration',
      _ImportDefaultSpecifier = 'ImportDefaultSpecifier',
      _ImportExpression = 'ImportExpression',
      _ImportNamespaceSpecifier = 'ImportNamespaceSpecifier',
      _ImportSpecifier = 'ImportSpecifier',
      _Literal = 'Literal',
      _LabeledStatement = 'LabeledStatement',
      _LogicalExpression = 'LogicalExpression',
      _MemberExpression = 'MemberExpression',
      _MetaProperty = 'MetaProperty',
      _MethodDefinition = 'MethodDefinition',
      _NewExpression = 'NewExpression',
      _ObjectExpression = 'ObjectExpression',
      _ObjectPattern = 'ObjectPattern',
      _Program = 'Program',
      _Property = 'Property',
      _RestElement = 'RestElement',
      _ReturnStatement = 'ReturnStatement',
      _SequenceExpression = 'SequenceExpression',
      _SpreadElement = 'SpreadElement',
      _Super = 'Super',
      _SwitchCase = 'SwitchCase',
      _SwitchStatement = 'SwitchStatement',
      _TaggedTemplateExpression = 'TaggedTemplateExpression',
      _TemplateElement = 'TemplateElement',
      _TemplateLiteral = 'TemplateLiteral',
      _ThisExpression = 'ThisExpression',
      _ThrowStatement = 'ThrowStatement',
      _TryStatement = 'TryStatement',
      _UnaryExpression = 'UnaryExpression',
      _UpdateExpression = 'UpdateExpression',
      _VariableDeclaration = 'VariableDeclaration',
      _VariableDeclarator = 'VariableDeclarator',
      _WhileStatement = 'WhileStatement',
      _WithStatement = 'WithStatement',
      _YieldExpression = 'YieldExpression';


  var assignOpRe = /^(?:[-+*%\/&|]?=|>>>?=|<<=|\*\*=)$/;
  var unaryOpRe = /^(?:[-+!~]|\+\+|--|typeof|void|delete)$/;
  var octalDigitRe = /^0[0-7]+$/;


  function Parser(options) {
    this.options = mixin({}, options || {});
  }

  Parser.prototype = {
    next: function() {
      if (this.token === TOKEN_END) {
        this.unexpected();
      }
      this.token = this.tokens[++this.index] || TOKEN_END;
      this.value = this.token.value;
      this.type = this.token.type;
    },
    lookahead: function(i) {
      if (i == null) {
        i = 1;
      }
      return this.tokens[this.index + i] || TOKEN_END;
    },
    assertValue: function(value) {
      if (this.value !== value) {
        this.unexpected();
      }
    },
    assertType: function(type) {
      if (this.type !== type) {
        this.unexpected();
      }
    },
    expect: function(value) {
      if (this.value !== value) {
        this.unexpected();
      }
      this.next();
    },
    expectType: function(type) {
      if (this.type !== type) {
        this.unexpected();
      }
      this.next();
    },
    expectSemicolon: function() {
      if (this.value === ';') {
        this.next();
        return true;
      }

      if (this.value === '}' ||
          this.token.hasLineTerminator || this.token === TOKEN_END) {
        return true;
      }

      this.unexpected();
    },
    unexpected: function() {
      var message = 'Unexpected';
      if (this.token === TOKEN_END) {
        message += ' end of input';
      } else {
        var token = this.value || '';
        if (token.length > 16) {
          token = token.substr(0, 16) + '...';
        }
        message += " token '" + token + "'";
      }
      this.throwError(message);
    },
    throwError: function(message) {
      var loc = this.token.loc;
      if (loc) {
        message += ' at line ' + loc.start.line + ' column ' + loc.start.column;
      }
      throw new Error(message);
    },
    startNode: function(type) {
      var node = {};
      this.startNodeAt(node);
      node.type = type;
      return node;
    },
    finishNode: function(node) {
      if (this.lastGroup && this.lastGroup.expr === node) {
        // Restore the original position
        var startNode = this.lastGroup.startNode;
        var endToken = this.lastGroup.endToken;
        this.lastGroup = null;
        this.startNodeAt(node, startNode);
        return this.finishNodeAt(node, endToken);
      }

      return this.finishNodeAt(node);
    },
    startNodeAt: function(node, startNode) {
      startNode = startNode || this.token;

      if (startNode === TOKEN_END) {
        if (this.length === 0) {
          startNode = this.getInitialLocationNode();
        } else {
          this.unexpected();
        }
      }

      if (this.options.range) {
        node.range = node.range || [];
        node.range[0] = startNode.range[0];
      }

      if (this.options.loc) {
        var loc = startNode.loc;
        node.loc = node.loc || {};
        node.loc.start = {
          line: loc.start.line,
          column: loc.start.column
        };
      }

      return node;
    },
    finishNodeAt: function(node, finishNode) {
      finishNode = finishNode || this.tokens[this.index - 1];

      if (!finishNode) {
        if (this.length === 0) {
          finishNode = this.getInitialLocationNode();
        } else {
          this.unexpected();
        }
      }

      if (this.options.range) {
        node.range[1] = finishNode.range[1];
      }

      if (this.options.loc) {
        node.loc.end = {
          line: finishNode.loc.end.line,
          column: finishNode.loc.end.column
        };
      }

      return node;
    },
    getInitialLocationNode: function() {
      return {
        range: [0, 0],
        loc: {
          start: {
            line: 0,
            column: 0
          },
          end: {
            line: 0,
            column: 0
          }
        }
      };
    },
    // ECMA-262, 16th: 12.9.3 Numeric Literals
    parseNumeric: function(value) {
      if (~value.indexOf('_')) {
        value = value.replace(/_/g, '');
      }

      var i = 0;
      var c = value.charAt(i++);
      var n;

      if (c === '0') {
        c = value.charAt(i++);
        n = value.substring(i);

        if (c !== '.') {
          switch (c.toLowerCase()) {
            case 'x':
              return parseInt(n, 16);
            case 'o':
              return parseInt(n, 8);
            case 'b':
              return parseInt(n, 2);
          }

          if (octalDigitRe.test(value)) {
            return parseInt(c + n, 8);
          }
        }
      }

      return parseFloat(value);
    },
    // ECMA-262, 16th: 12.9.4 String Literals
    parseString: function(value) {
      var s = '';
      var i = 1;
      var len = value.length - 1;
      var c, c2, hex, n, index, length;

      while (i < len) {
        c = value.charAt(i++);

        if (c === '\\') {
          if (i < len) {
            c2 = value.charCodeAt(i);
            if (isLineTerminator(c2)) {
              i++;
              if (c2 === 0x0D && i < len && value.charCodeAt(i) === 0x0A) {
                i++;
              }
              continue;
            }
          }

          c = value.charAt(i++);
          switch (c) {
            case 'b':
              c = '\b';
              break;
            case 't':
              c = '\t';
              break;
            case 'r':
              c = '\r';
              break;
            case 'n':
              c = '\n';
              break;
            case 'v':
              c = '\x0B';
              break;
            case 'f':
              c = '\f';
              break;
            case 'u':
            case 'x':
              if (c === 'u' && i < len && value.charAt(i) === '{') {
                i++;
                index = value.indexOf('}', i);
                if (!~index) {
                  this.unexpected();
                }
                hex = value.substring(i, index);
                i = index + 1;
              } else {
                length = c === 'u' ? 4 : 2;
                hex = value.substr(i, length);
                i += length;
              }
              c = fromCodePoint(parseInt(hex, 16));
              break;
            default:
              if (isOctalDigit(c)) {
                n = c;
                do {
                  c = value.charAt(i);
                  if (!isOctalDigit(c)) {
                    break;
                  }
                  n += c;
                } while (i++ < len && n.length < 3);

                if (n.length > 0 && n.charAt(0) === '0') {
                  n = n.substring(1);
                }
                c = fromCharCode(parseInt(n, 8));
              }
          }
        }
        s += c;
      }

      return s;
    },
    parseLiteral: function() {
      var node = this.startNode(_Literal);
      var raw = this.value;
      var value, regex, bigint;

      switch (this.type) {
        case _Numeric:
          // ES2020 BigInt literal
          if (raw.charAt(raw.length - 1) === 'n') {
            // Remove the 'n' suffix and numeric separators because the BigInt
            // cannot parse them (e.g., BigInt('123_456') throws a SyntaxError)
            bigint = raw.replace(/_|n$/g, '');
            if (hasBigInt) {
              // ESTree spec requires `bigint` to be the decimal string
              value = BigInt(bigint);
              bigint = value.toString();
            } else {
              value = null;
            }
          } else {
            value = this.parseNumeric(raw);
          }
          break;
        case _String:
          value = this.parseString(raw);
          break;
        case _RegularExpression:
          regex = this.token.regex;
          try {
            value = new RegExp(regex.pattern, regex.flags);
          } catch (e) {
            value = null;
          }
          break;
        case _Boolean:
          value = raw === 'true';
          break;
        case _Null:
          value = null;
          break;
        default:
          this.unexpected();
      }

      this.next();

      node.value = value;
      node.raw = raw;
      if (regex) {
        node.regex = regex;
      }
      if (bigint != null) {
        node.bigint = bigint;
      }

      return this.finishNode(node);
    },
    parseIdentifier: function(allowKeyword) {
      var node = this.startNode(_Identifier);
      var name = this.value;

      if (allowKeyword) {
        this.next();
      } else {
        this.expectType(_Identifier);
      }

      node.name = name;
      return this.finishNode(node);
    },
    // `yield` and `await` are allowed as identifiers outside their context
    // (i.e. outside generators / async functions).
    isContextualIdentifier: function() {
      return this.type === _Identifier ||
        (this.value === 'yield' && !this.inGenerator) ||
        (this.value === 'await' && !this.inAsync);
    },
    // Callers should guard with `isContextualIdentifier()` beforehand.
    parseContextualIdentifier: function() {
      return this.parseIdentifier(true);
    },
    parseCommaSeparatedElements: function(start, end, elems, callback, args) {
      this.expect(start);

      while (this.value !== end) {
        elems[elems.length] = callback.apply(this, args);
        if (this.value !== end) {
          this.expect(',');
        }
      }

      this.expect(end);
      return elems;
    },
    // ECMA-262, 16th: 13.2 Primary Expression
    parsePrimaryExpression: function() {
      // Detect async function before treating it as a plain Identifier
      // because `async` is a contextual keyword.
      if (this.isAsyncFunctionAhead()) {
        this.next(); // eat 'async'
        return this.parseFunctionExpression({ async: true });
      }
      if (this.isAsyncArrowAhead()) {
        return this.parseAsyncArrowHead();
      }
      switch (this.type) {
        case _Numeric:
        case _String:
        case _RegularExpression:
        case _Boolean:
        case _Null:
          return this.parseLiteral();
        case _Identifier:
          return this.parseIdentifier();
        case _Keyword:
          return this.parsePrimaryKeywordExpression();
        case _Punctuator:
          return this.parsePrimaryPunctuatorExpression();
        case _Template:
          return this.parseTemplateLiteral();
      }

      this.unexpected();
    },
    parseAsyncArrowHead: function() {
      var startNode = this.startNode();
      this.next(); // eat 'async'

      var head;
      if (this.value === '(') {
        head = this.parseGroupExpression();
      } else {
        // single-identifier param: `async ident =>`
        var id = this.parseIdentifier(true);
        head = {
          type: _ArrowParameters,
          params: [id]
        };
      }
      head.async = true;
      head.startNode = startNode;
      return head;
    },
    parsePrimaryKeywordExpression: function() {
      switch (this.value) {
        case 'function':
          return this.parseFunctionExpression();
        case 'class':
          return this.parseClassExpression();
        case 'this':
          return this.parseThisExpression();
        case 'import':
          // ES2020: dynamic import() and import.meta
          return this.parseImportExpression();
      }

      this.unexpected();
    },
    parseImportExpression: function() {
      var node = this.startNode();

      if (this.lookahead().value === '.') {
        node.type = _MetaProperty;
        node.meta = this.parseIdentifier(true);
        this.expect('.');
        node.property = this.parseIdentifier(true);
        return this.finishNode(node);
      }

      this.expect('import');
      node.type = _ImportExpression;
      this.expect('(');
      node.source = this.parseAssignmentExpression(true);

      // Permissively accept (and ignore) the ES2025 options argument.
      if (this.value === ',') {
        this.next();
        if (this.value !== ')') {
          this.parseAssignmentExpression(true);
        }
        if (this.value === ',') {
          this.next();
        }
      }
      this.expect(')');
      return this.finishNode(node);
    },
    parseThisExpression: function() {
      var node = this.startNode(_ThisExpression);
      this.expect('this');
      return this.finishNode(node);
    },
    parsePrimaryPunctuatorExpression: function() {
      switch (this.value) {
        case '{':
          return this.parseObjectInitializer();
        case '[':
          return this.parseArrayInitializer();
        case '(':
          return this.parseGroupExpression();
      }

      this.unexpected();
    },
    parseGroupExpression: function() {
      var startNode = this.startNode();
      this.expect('(');

      if (this.value === ')') {
        this.next();
        this.assertValue('=>');
        return {
          type: _ArrowParameters,
          params: [],
          startNode: startNode
        };
      }

      var innerStart = this.startNode();
      var items = [];
      var restElement = null;

      for (;;) {
        if (this.value === '...') {
          restElement = this.parseRestElement();
          break;
        }
        items[items.length] = this.parseAssignmentExpression(true);
        if (this.value !== ',') {
          break;
        }
        this.next();
        // ES2017: trailing comma in arrow parameters
        if (this.value === ')') {
          break;
        }
      }

      var endToken = this.tokens[this.index - 1];
      this.expect(')');

      // Arrow function: rest forces it; otherwise `=>` lookahead.
      if (restElement || this.value === '=>') {
        var params = [];
        for (var i = 0, len = items.length; i < len; i++) {
          this.reinterpretExpression(items[i]);
          params[params.length] = items[i];
        }
        if (restElement) {
          params[params.length] = restElement;
        }
        return {
          type: _ArrowParameters,
          params: params,
          startNode: startNode
        };
      }

      var expr;
      if (items.length === 1) {
        expr = items[0];
      } else {
        expr = this.startNode(_SequenceExpression);
        this.startNodeAt(expr, innerStart);
        expr.expressions = items;
        expr = this.finishNodeAt(expr, endToken);
      }

      // Keep the inner expression's position so a parent's startNodeAt
      // does not extend the range to include the outer parens.
      this.lastGroup = {
        expr: expr,
        startNode: innerStart,
        endToken: endToken
      };

      return expr;
    },
    // ECMA-262, 16th: 13.2.5 Object Initializer
    parseObjectInitializer: function() {
      var node = this.startNode(_ObjectExpression);
      node.properties = this.parseCommaSeparatedElements('{', '}', [],
        this.parseObjectDefinition);

      return this.finishNode(node);
    },
    parseObjectDefinition: function() {
      var value = this.value;
      var node;

      if (value === '...') {
        node = this.parseSpreadElement();
      } else if (value === 'get' || value === 'set') {
        node = this.parseObjectGetterSetter();
      } else {
        node = this.parseObjectProperty();
      }

      return node;
    },
    parseObjectProperty: function() {
      var node = this.startNode(_Property);
      var computed = false;
      var method = false;
      var shorthand = false;
      var generator = false;
      var isAsync = false;

      // `async method() {}`
      // `async` is the modifier only when followed by a property name
      // (not by `(`, `:`, `,`, `}`, or `=`) on the same line.
      if (this.value === 'async' && !this.lookahead().hasLineTerminator) {
        var afterAsync = this.lookahead().value;
        if (afterAsync !== '(' && afterAsync !== ':' &&
          afterAsync !== ',' && afterAsync !== '}' && afterAsync !== '=') {
          isAsync = true;
          this.next();
        }
      }

      if (this.value === '*') {
        generator = true;
        this.next();
      } else if (this.value === '[') {
        computed = true;
      }

      var key = this.parseObjectPropertyName();
      var value;

      if (this.value === ':') {
        this.next();
        value = this.parseAssignmentExpression(true);
      } else if (this.value === '(') {
        method = true;
        value = this.parseFunction({
          expression: true,
          generator: generator,
          async: isAsync
        });
      } else if (key.type === _Identifier) {
        shorthand = true;
        if (this.value === '=') {
          value = this.parseAssignmentPattern(key);
        } else {
          value = key;
        }
      } else {
        this.unexpected();
      }

      node.key = key;
      node.computed = computed;
      node.value = value;
      node.kind = 'init';
      node.method = method;
      node.shorthand = shorthand;
      return this.finishNode(node);
    },
    parseObjectGetterSetter: function() {
      var node = this.startNode(_Property);
      var lookahead = this.lookahead();
      var computed = false;
      var method = false;
      var shorthand = false;
      var kind = 'init';
      var key, value;

      if (lookahead.value === ':') {
        key = this.parseObjectPropertyName();
        this.next();
        value = this.parseAssignmentExpression(true);
      } else if (lookahead.value === '(') {
        method = true;
        key = this.parseObjectPropertyName();
        value = this.parseFunction({ expression: true });
      } else {
        kind = this.value;
        this.next();
        if (this.value === '[') {
          computed = true;
        }

        if (computed || this.type === _Identifier || this.type === _Keyword ||
            this.type === _String || this.type === _Numeric) {
          key = this.parseObjectPropertyName();
          value = this.parseFunction({
            getter: kind === 'get',
            setter: kind === 'set',
            expression: true
          });
        } else {
          this.unexpected();
        }
      }

      node.key = key;
      node.computed = computed;
      node.value = value;
      node.kind = kind;
      node.method = method;
      node.shorthand = shorthand;
      return this.finishNode(node);
    },
    parseObjectPropertyName: function() {
      var node;

      switch (this.type) {
        case _String:
        case _Numeric:
          return this.parseLiteral();
        case _Punctuator:
          if (this.value === '[') {
            this.next();
            node = this.parseAssignmentExpression();
            this.expect(']');
            return node;
          }
          break;
        case _Keyword:
        case _Identifier:
        case _Boolean:
        case _Null:
          return this.parseIdentifier(true);
      }

      this.unexpected();
    },
    // ECMA-262, 16th: 13.2.4 Array Initializer
    parseArrayInitializer: function() {
      var node = this.startNode(_ArrayExpression);
      var elems = [];

      this.expect('[');

      while (this.value !== ']') {
        if (this.value === ',') {
          this.next();
          elems[elems.length] = null;
          continue;
        }

        if (this.value === '...') {
          elems[elems.length] = this.parseSpreadElement();
        } else {
          elems[elems.length] = this.parseAssignmentExpression(true);
        }

        if (this.value !== ']') {
          this.expect(',');
        }
      }

      this.expect(']');

      node.elements = elems;
      return this.finishNode(node);
    },
    // ECMA-262, 16th: A.2 Expressions
    parseExpression: function(allowIn) {
      var node = this.startNode(_SequenceExpression);
      var expr = this.parseAssignmentExpression(allowIn);
      if (this.value !== ',') {
        return expr;
      }

      var exprs = [expr];

      do {
        this.next();
        exprs[exprs.length] = this.parseAssignmentExpression(allowIn);
      } while (this.value === ',');

      node.expressions = exprs;
      return this.finishNode(node);
    },
    reinterpretExpression: function(expr) {
      var i, len;

      switch (expr.type) {
        case _AssignmentExpression:
          expr.type = _AssignmentPattern;
          this.reinterpretExpression(expr.left);
          break;
        case _ArrayExpression:
          expr.type = _ArrayPattern;
          for (i = 0, len = expr.elements.length; i < len; i++) {
            if (expr.elements[i] !== null) {
              this.reinterpretExpression(expr.elements[i]);
            }
          }
          break;
        case _ObjectExpression:
          expr.type = _ObjectPattern;
          for (i = 0, len = expr.properties.length; i < len; i++) {
            var prop = expr.properties[i];
            if (prop.type === _SpreadElement) {
              this.reinterpretExpression(prop);
            } else {
              this.reinterpretExpression(prop.value);
            }
          }
          break;
        case _SpreadElement:
          expr.type = _RestElement;
          this.reinterpretExpression(expr.argument);
          break;
      }
    },
    parseAssignmentExpression: function(allowIn) {
      if (this.inGenerator && this.value === 'yield') {
        return this.parseYieldExpression();
      }
      var node = this.startNode(_AssignmentExpression);
      var left = this.parseConditionalExpression(allowIn);

      if (this.value === '=>' || left.type === _ArrowParameters) {
        if (left.type === _Identifier) {
          left.params = [mixin({}, left)];
          left.startNode = node;
        }
        return this.parseArrowFunctionExpression(left);
      }

      if (!assignOpRe.test(this.value)) {
        return left;
      }
      this.reinterpretExpression(left);

      var operator = this.value;
      this.next();
      var right = this.parseAssignmentExpression(allowIn);

      node.operator = operator;
      node.left = left;
      node.right = right;
      return this.finishNode(node);
    },
    parseConditionalExpression: function(allowIn) {
      var node = this.startNode(_ConditionalExpression);
      var expr = this.parseBinaryExpression(allowIn);
      if (this.value !== '?') {
        return expr;
      }

      this.expect('?');
      var consequent = this.parseAssignmentExpression(true);
      this.expect(':');
      var alternate = this.parseAssignmentExpression(allowIn);

      node.test = expr;
      node.consequent = consequent;
      node.alternate = alternate;
      return this.finishNode(node);
    },
    parseArrowFunctionExpression: function(expr) {
      var node = this.startNode(_ArrowFunctionExpression);
      this.startNodeAt(node, expr.startNode);
      this.expect('=>');

      var params = expr.params || [];
      var isAsync = !!expr.async;
      var expression = false;
      var body;

      var prevInAsync = this.inAsync;
      this.inAsync = isAsync;

      if (this.value === '{') {
        body = this.parseBlockStatement();
      } else {
        body = this.parseAssignmentExpression(true);
        expression = true;
      }
      this.inAsync = prevInAsync;

      node.params = params;
      node.body = body;
      if (isAsync) {
        node.async = true;
      }
      node.expression = expression;
      return this.finishNode(node);
    },
    parseAwaitExpression: function() {
      var node = this.startNode(_AwaitExpression);

      this.expect('await');
      node.argument = this.parseUnaryExpression();
      return this.finishNode(node);
    },
    parseYieldExpression: function() {
      var node = this.startNode(_YieldExpression);
      var argument = null;
      var delegate = false;

      this.expect('yield');
      if (!this.token.hasLineTerminator) {
        if (this.value === '*') {
          delegate = true;
          this.next();
          argument = this.parseAssignmentExpression(true);
        } else if (this.value !== ';' && this.value !== '}' &&
                   this.token !== TOKEN_END) {
          argument = this.parseAssignmentExpression(true);
        }
      }

      node.argument = argument;
      node.delegate = delegate;
      return this.finishNode(node);
    },
    getBinaryPrecedence: function(allowIn) {
      switch (this.value) {
        case '*':
        case '/':
        case '%':
          return 1;
        case '+':
        case '-':
          return 2;
        case '<<':
        case '>>':
        case '>>>':
          return 3;
        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
          return 4;
        case 'in':
          return allowIn ? 4 : 0;
        case '==':
        case '!=':
        case '===':
        case '!==':
          return 5;
        case '&':
          return 6;
        case '^':
          return 7;
        case '|':
          return 8;
        case '&&':
          return 9;
        case '||':
          return 10;
        case '??':
          return 11;
      }
      return 0;
    },
    parseBinaryExpression: function(allowIn, base) {
      if (base == null) {
        base = 11;
      }

      var startNode = this.startNode();
      var left = this.parseExponentiationExpression();
      var prec = this.getBinaryPrecedence(allowIn);
      if (!prec) {
        return left;
      }
      var right, operator, node;

      for (var i = 1; i <= 11; i++) {
        while ((prec = this.getBinaryPrecedence(allowIn)) === i) {
          operator = this.value;

          node = this.startNode(i < 9 ? _BinaryExpression : _LogicalExpression);
          this.startNodeAt(node, startNode);
          node.operator = operator;
          node.left = left;

          this.next();

          if (prec === 1) {
            right = this.parseExponentiationExpression();
          } else {
            right = this.parseBinaryExpression(allowIn, prec - 1);
          }

          node.right = right;
          left = this.finishNode(node);
        }

        if (base < prec) {
          break;
        }
      }

      this.startNodeAt(left, startNode);
      return this.finishNode(left);
    },
    // ECMA-262, 16th: 13.6 Exponentiation Operator
    // Right-associative; binds tighter than multiplicative.
    parseExponentiationExpression: function() {
      var startNode = this.startNode();
      var left = this.parseUnaryExpression();
      if (this.value !== '**') {
        return left;
      }

      var node = this.startNode(_BinaryExpression);
      this.startNodeAt(node, startNode);
      this.next();

      node.operator = '**';
      node.left = left;
      node.right = this.parseExponentiationExpression();
      return this.finishNode(node);
    },
    parseUnaryExpression: function() {
      var value = this.value;
      if (this.inAsync && value === 'await') {
        return this.parseAwaitExpression();
      }
      if (!unaryOpRe.test(value)) {
        return this.parsePostfixExpression();
      }

      var isUpdate = (value === '++' || value === '--');
      var node = this.startNode(isUpdate ? _UpdateExpression : _UnaryExpression);

      this.next();
      var argument = this.parseUnaryExpression();

      node.operator = value;
      node.argument = argument;
      node.prefix = true;
      return this.finishNode(node);
    },
    parsePostfixExpression: function() {
      var node = this.startNode(_UpdateExpression);
      var expr = this.parseMemberExpression(true);
      var value = this.value;

      if (value === '++' || value === '--') {
        this.next();
        node.operator = value;
        node.argument = expr;
        node.prefix = false;
        return this.finishNode(node);
      }

      return expr;
    },
    parseMemberExpression: function(allowCall) {
      var node = this.startNode();
      var expr;

      if (this.value === 'super') {
        expr = this.parseSuper();
      } else if (this.value === 'new') {
        expr = this.parseNewExpression();
      } else {
        expr = this.parsePrimaryExpression();
      }

      var optionalChain = false;
      for (;;) {
        if (this.value === '?.') {
          optionalChain = true;
          this.next();
          if (this.value === '(') {
            expr = this.parseCallExpression(expr, node, true);
          } else if (this.value === '[') {
            expr = this.parseComputedMember(expr, node, true);
          } else {
            expr = this.parseNonComputedMember(expr, node, true);
          }
        } else if (this.value === '.') {
          expr = this.parseNonComputedMember(expr, node);
        } else if (this.value === '[') {
          expr = this.parseComputedMember(expr, node);
        } else if (allowCall && this.value === '(') {
          expr = this.parseCallExpression(expr, node);
        } else if (this.type === _Template && this.value.charAt(0) === '`') {
          expr = this.parseTaggedTemplateExpression(expr, node);
        } else {
          break;
        }
      }

      if (optionalChain) {
        var chain = { type: _ChainExpression };
        this.startNodeAt(chain, node);
        chain.expression = expr;
        return this.finishNodeAt(chain);
      }
      return expr;
    },
    parseSuper: function() {
      var node = this.startNode(_Super);
      this.expect('super');
      return this.finishNode(node);
    },
    parseNewExpression: function() {
      var node = this.startNode(_NewExpression);
      this.next();

      var callee = this.parseMemberExpression(false);
      node.callee = callee;
      node.arguments = [];

      if (this.value === '(') {
        this.parseArguments(node);
      }

      return this.finishNode(node);
    },
    parseCallExpression: function(expr, startNode, optional) {
      var node = this.startNode(_CallExpression);
      this.startNodeAt(node, startNode);

      node.callee = expr;
      if (optional) {
        node.optional = true;
      }
      node.arguments = [];
      this.parseArguments(node);
      return this.finishNode(node);
    },
    parseComputedMember: function(expr, startNode, optional) {
      var node = this.startNode(_MemberExpression);
      this.startNodeAt(node, startNode);
      this.next();

      node.computed = true;
      if (optional) {
        node.optional = true;
      }
      node.object = expr;
      node.property = this.parseExpression(true);

      this.expect(']');
      return this.finishNode(node);
    },
    parseNonComputedMember: function(expr, startNode, optional) {
      var node = this.startNode(_MemberExpression);
      this.startNodeAt(node, startNode);
      if (!optional) {
        this.next(); // eat '.'
      }

      node.computed = false;
      if (optional) {
        node.optional = true;
      }
      node.object = expr;

      // Same type check as parseObjectPropertyName
      // IdentifierName after `.` allows reserved words and `null, true, false`
      // (e.g. `obj.static`, `obj.class`, `obj.null`)
      var type = this.type;
      if (type !== _Identifier && type !== _Keyword &&
          type !== _Boolean && type !== _Null) {
        this.unexpected();
      }
      node.property = this.parseIdentifier(true);
      return this.finishNode(node);
    },
    parseArguments: function(node) {
      this.parseCommaSeparatedElements('(', ')', node.arguments,
        this._parseArgumentsCallback);

      return node;
    },
    _parseArgumentsCallback: function() {
      if (this.value === '...') {
        return this.parseSpreadElement();
      }
      return this.parseAssignmentExpression(true);
    },
    parseTemplateLiteral: function() {
      var node = this.startNode(_TemplateLiteral);
      var quasi = this.parseTemplateElement();
      var quasis = [quasi];
      var exprs = [];

      while (!quasi.tail) {
        exprs[exprs.length] = this.parseExpression();
        quasi = this.parseTemplateElement();
        quasis[quasis.length] = quasi;
      }

      node.quasis = quasis;
      node.expressions = exprs;
      return this.finishNode(node);
    },
    parseTemplateElement: function() {
      var node = this.startNode(_TemplateElement);
      var tail = false;
      var raw;

      this.assertType(_Template);

      if (this.value.slice(-1) === '`') {
        tail = true;
      }

      var endPos = tail ? -1 : -2;
      raw = this.value.slice(1, endPos);

      var cooked = this.parseString('`' + raw + '`');
      this.next();

      node.tail = tail;
      node.value = {
        cooked: cooked,
        raw: raw
      };
      return this.finishNode(node);
    },
    parseTaggedTemplateExpression: function(tag, startNode) {
      var node = this.startNode(_TaggedTemplateExpression);
      this.startNodeAt(node, startNode);
      var quasi = this.parseTemplateLiteral();

      node.tag = tag;
      node.quasi = quasi;
      return this.finishNode(node);
    },
    isAsyncFunctionAhead: function() {
      if (this.value !== 'async') {
        return false;
      }
      var next = this.lookahead();
      return next.value === 'function' && !next.hasLineTerminator;
    },
    isAsyncArrowAhead: function() {
      if (this.value !== 'async') {
        return false;
      }

      var next = this.lookahead();
      if (!next || next.hasLineTerminator) {
        return false;
      }

      // `async ident =>`
      if (next.type === _Identifier) {
        var afterIdent = this.lookahead(2);
        return afterIdent.value === '=>' && !afterIdent.hasLineTerminator;
      }

      // `async (...) =>`
      if (next.value === '(') {
        var depth = 0;
        for (var i = this.index + 1, len = this.tokens.length; i < len; i++) {
          var token = this.tokens[i];
          if (token.value === '(') {
            depth++;
          } else if (token.value === ')') {
            if (--depth === 0) {
              var after = this.lookahead(i - this.index + 1);
              return after.value === '=>' && !after.hasLineTerminator;
            }
          }
        }
      }
      return false;
    },
    // ECMA-262, 16th: 14 ECMAScript Language: Statements and Declarations
    parseStatement: function() {
      if (this.isAsyncFunctionAhead()) {
        this.next(); // eat 'async'
        return this.parseFunctionDeclaration({ async: true });
      }
      switch (this.value) {
        case '{':
          return this.parseBlockStatement();
        case 'var':
        case 'let':
        case 'const':
          return this.parseVariableStatement(this.value);
        case ';':
          return this.parseEmptyStatement();
        case 'if':
          return this.parseIfStatement();
        case 'continue':
          return this.parseContinueStatement();
        case 'break':
          return this.parseBreakStatement();
        case 'return':
          return this.parseReturnStatement();
        case 'with':
          return this.parseWithStatement();
        case 'throw':
          return this.parseThrowStatement();
        case 'try':
          return this.parseTryStatement();
        case 'debugger':
          return this.parseDebuggerStatement();
        case 'function':
          return this.parseFunctionDeclaration();
        case 'class':
          return this.parseClassDeclaration();
        case 'switch':
          return this.parseSwitchStatement();
        case 'do':
          return this.parseDoWhileStatement();
        case 'while':
          return this.parseWhileStatement();
        case 'for':
          return this.parseForStatement();
        case 'import':
          var nextValue = this.lookahead().value;
          if (nextValue === '(' || nextValue === '.') {
            // Dynamic import and import.meta are expressions, not statements
            break;
          }
          return this.parseImportDeclaration();
        case 'export':
          return this.parseExportDeclaration();
      }
      return this.parseMaybeExpressionStatement();
    },
    parseScriptBody: function(body, end) {
      while (this.value !== end) {
        body[body.length] = this.parseStatement();
      }
    },
    parseBlockStatement: function() {
      var node = this.startNode(_BlockStatement);
      this.expect('{');

      var body = [];
      this.parseScriptBody(body, '}');
      this.expect('}');

      node.body = body;
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 14.3.2 Variable Statement
    parseVariableStatement: function(kind, inFor) {
      var node = this.startNode(_VariableDeclaration);
      var allowIn = !inFor;
      var declarations = this.parseVariableDeclarationList(allowIn);

      if (!inFor) {
        this.expectSemicolon();
      }

      node.declarations = declarations;
      node.kind = kind;
      return this.finishNode(node);
    },
    parseVariableDeclarationList: function(allowIn) {
      var list = [];

      do {
        list[list.length] = this.parseVariableDeclaration(allowIn);
      } while (this.value === ',');

      return list;
    },
    parseVariableDeclaration: function(allowIn) {
      this.next();

      var node = this.startNode(_VariableDeclarator);
      var id = this.parseBindingPattern();
      var init = null;

      if (this.value === '=') {
        this.next();
        init = this.parseAssignmentExpression(allowIn);
      }

      node.id = id;
      node.init = init;
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 15.2 Function Definitions
    parseFunctionDeclaration: function(options) {
      return this.parseFunctionDefinition(options || {});
    },
    parseFunctionExpression: function(options) {
      options = options || {};
      options.expression = true;
      return this.parseFunctionDefinition(options);
    },
    parseFunctionDefinition: function(options) {
      options = options || {};
      var node = options.node || this.startNode();
      var generator = false;

      this.expect('function');
      if (this.value === '*') {
        generator = true;
        this.next();
      }

      return this.parseFunction({
        node: node,
        generator: generator,
        expression: options.expression,
        async: options.async
      });
    },
    parseFunction: function(options) {
      options = options || {};

      var node = options.node || this.startNode();
      node.type = options.expression ? _FunctionExpression : _FunctionDeclaration;
      node.id = null;
      node.params = [];
      node.body = null;
      node.generator = !!options.generator;
      if (options.async) {
        node.async = true;
      }
      node.expression = false;

      if (options.getter) {
        this.expect('(');
        this.expect(')');
      } else if (options.setter) {
        this.parseParams(node);
      } else {
        if (this.isContextualIdentifier()) {
          node.id = this.parseContextualIdentifier();
        }
        this.parseParams(node);
      }

      var prevInGenerator = this.inGenerator;
      var prevInAsync = this.inAsync;
      this.inGenerator = node.generator;
      this.inAsync = node.async;
      node.body = this.parseBlockStatement();
      this.inGenerator = prevInGenerator;
      this.inAsync = prevInAsync;
      return this.finishNode(node);
    },
    parseParams: function(node) {
      this.expect('(');

      while (this.value !== ')') {
        if (!this.parseParam(node)) {
          break;
        }
      }
      this.expect(')');
    },
    parseParam: function(node) {
      var params = node.params;
      if (this.value === '...') {
        params[params.length] = this.parseRestElement();
        return false;
      }

      var pattern = this.parseBindingElement();
      params[params.length] = pattern;

      if (this.value !== ')') {
        this.expect(',');
      }

      return true;
    },
    parseRestElement: function() {
      var node = this.startNode(_RestElement);

      this.expect('...');
      node.argument = this.parseBindingPattern();
      return this.finishNode(node);
    },
    parseSpreadElement: function() {
      var node = this.startNode(_SpreadElement);

      this.expect('...');
      node.argument = this.parseAssignmentExpression(true);
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 14.3.3 Destructuring Binding Patterns
    parseBindingPattern: function() {
      if (this.isContextualIdentifier()) {
        return this.parseContextualIdentifier();
      }

      if (this.value === '{') {
        return this.parseObjectPattern();
      }

      if (this.value === '[') {
        return this.parseArrayPattern();
      }

      this.unexpected();
    },
    parseBindingElement: function() {
      var pattern = this.parseBindingPattern();
      if (this.value === '=') {
        return this.parseAssignmentPattern(pattern);
      }
      return pattern;
    },
    parseAssignmentPattern: function(left) {
      this.expect('=');

      var node = this.startNode(_AssignmentPattern);
      this.startNodeAt(node, left);
      var right = this.parseAssignmentExpression(true);

      node.left = left;
      node.right = right;
      return this.finishNode(node);
    },
    parseArrayPattern: function() {
      var node = this.startNode(_ArrayPattern);
      var elems = [];

      this.expect('[');

      while (this.value !== ']') {
        if (this.value === ',') {
          elems[elems.length] = null;
        } else {
          if (this.value === '...') {
            elems[elems.length] = this.parseRestElement();
            break;
          }
          elems[elems.length] = this.parseBindingElement();
        }

        if (this.value !== ']') {
          this.expect(',');
        }
      }

      this.expect(']');

      node.elements = elems;
      return this.finishNode(node);
    },
    parseObjectPattern: function() {
      var node = this.startNode(_ObjectPattern);
      node.properties = this.parseCommaSeparatedElements('{', '}', [],
        this.parseObjectPropertyPattern);

      return this.finishNode(node);
    },
    parseObjectPropertyPattern: function() {
      if (this.value === '...') {
        return this.parseRestElement();
      }

      var node = this.startNode(_Property);
      var key, value;
      var computed = false;
      var shorthand = false;

      if (this.isContextualIdentifier()) {
        key = this.parseContextualIdentifier();
        if (this.value === '=') {
          value = this.parseAssignmentPattern(key);
          this.startNodeAt(value, node);
          shorthand = true;
        } else if (this.value !== ':') {
          value = key;
          shorthand = true;
        }
      } else {
        if (this.value === '[') {
          computed = true;
        }
        key = this.parseObjectPropertyName();
      }

      if (!value) {
        this.expect(':');
        value = this.parseBindingElement();
      }

      node.key = key;
      node.computed = computed;
      node.value = value;
      node.kind = 'init';
      node.method = false;
      node.shorthand = shorthand;
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 14 Statements and Declarations
    parseIfStatement: function() {
      var node = this.startNode(_IfStatement);
      this.expect('if');
      this.expect('(');

      var expr = this.parseExpression(true);
      this.expect(')');
      var consequent = this.parseStatement();
      var alternate = null;

      if (this.value === 'else') {
        this.next();
        alternate = this.parseStatement();
      }

      node.test = expr;
      node.consequent = consequent;
      node.alternate = alternate;
      return this.finishNode(node);
    },
    parseEmptyStatement: function() {
      var node = this.startNode(_EmptyStatement);
      this.expect(';');
      return this.finishNode(node);
    },
    parseContinueStatement: function() {
      var node = this.startNode(_ContinueStatement);
      this.expect('continue');

      var label = null;
      if (!this.token.hasLineTerminator && this.isContextualIdentifier()) {
        label = this.parseContextualIdentifier();
      }

      this.expectSemicolon();
      node.label = label;
      return this.finishNode(node);
    },
    parseBreakStatement: function() {
      var node = this.startNode(_BreakStatement);
      this.expect('break');

      var label = null;
      if (!this.token.hasLineTerminator && this.isContextualIdentifier()) {
        label = this.parseContextualIdentifier();
      }

      this.expectSemicolon();
      node.label = label;
      return this.finishNode(node);
    },
    parseReturnStatement: function() {
      var node = this.startNode(_ReturnStatement);
      this.expect('return');

      var argument = null;

      if (this.value !== ';' && this.value !== '}' &&
          !this.token.hasLineTerminator && this.token !== TOKEN_END) {
        argument = this.parseExpression(true);
      }

      this.expectSemicolon();
      node.argument = argument;
      return this.finishNode(node);
    },
    parseWithStatement: function() {
      var node = this.startNode(_WithStatement);
      this.expect('with');
      this.expect('(');

      var expr = this.parseExpression(true);
      this.expect(')');

      node.object = expr;
      node.body = this.parseStatement();
      return this.finishNode(node);
    },
    parseThrowStatement: function() {
      var node = this.startNode(_ThrowStatement);
      this.expect('throw');

      if (this.token.hasLineTerminator) {
        this.unexpected();
      }

      var expr = this.parseExpression(true);
      this.expectSemicolon();
      node.argument = expr;
      return this.finishNode(node);
    },
    parseTryStatement: function() {
      var node = this.startNode(_TryStatement);
      var handler = null;
      var finalizer = null;
      var hasCatch, hasFinally;

      this.expect('try');
      var block = this.parseBlockStatement();

      if (this.value === 'catch') {
        hasCatch = true;
        handler = this.parseCatchClause();
      }

      if (this.value === 'finally') {
        hasFinally = true;
        this.next();
        finalizer = this.parseBlockStatement();
      }

      if (!hasCatch && !hasFinally) {
        this.unexpected();
      }

      node.block = block;
      node.handler = handler;
      node.finalizer = finalizer;
      return this.finishNode(node);
    },
    parseCatchClause: function() {
      var node = this.startNode(_CatchClause);
      this.expect('catch');

      // ES2019 optional catch binding: `catch {}` with no parameter.
      var param = null;
      if (this.value === '(') {
        this.next();
        param = this.parseBindingPattern();
        this.expect(')');
      }

      var body = this.parseBlockStatement();
      node.param = param;
      node.body = body;
      return this.finishNode(node);
    },
    parseDebuggerStatement: function() {
      var node = this.startNode(_DebuggerStatement);
      this.expect('debugger');
      this.expectSemicolon();
      return this.finishNode(node);
    },
    parseSwitchStatement: function() {
      var node = this.startNode(_SwitchStatement);
      this.expect('switch');
      this.expect('(');

      var expr = this.parseExpression(true);
      var cases = [];

      this.expect(')');
      this.expect('{');

      while (this.value !== '}') {
        cases[cases.length] = this.parseSwitchCase();
      }

      this.expect('}');
      node.discriminant = expr;
      node.cases = cases;
      return this.finishNode(node);
    },
    parseSwitchCase: function() {
      var node = this.startNode(_SwitchCase);
      var test = null;
      var consequent = [];

      if (this.value === 'case') {
        this.next();
        test = this.parseExpression(true);
      } else {
        this.expect('default');
      }

      this.expect(':');

      while (this.value !== '}' && this.value !== 'case' &&
             this.value !== 'default' && this.token !== TOKEN_END) {
        consequent[consequent.length] = this.parseStatement();
      }

      node.test = test;
      node.consequent = consequent;
      return this.finishNode(node);
    },
    parseWhileStatement: function() {
      var node = this.startNode(_WhileStatement);
      this.expect('while');
      this.expect('(');

      var expr = this.parseExpression(true);
      this.expect(')');

      node.test = expr;
      node.body = this.parseStatement();
      return this.finishNode(node);
    },
    parseDoWhileStatement: function() {
      var node = this.startNode(_DoWhileStatement);
      this.expect('do');

      var body = this.parseStatement();
      this.expect('while');
      this.expect('(');

      var expr = this.parseExpression(true);
      this.expect(')');
      this.expectSemicolon();

      node.body = body;
      node.test = expr;
      return this.finishNode(node);
    },
    parseForStatement: function() {
      var node = this.startNode(_ForStatement);
      this.expect('for');

      // ES2018 for-await-of only valid inside async functions.
      var isAwait = false;
      if (this.inAsync && this.value === 'await') {
        isAwait = true;
        this.next();
      }

      this.expect('(');

      var init = null;

      if (this.value !== ';') {
        if (this.value === 'var' || this.value === 'let' || this.value === 'const') {
          init = this.parseForVarStatement(node, isAwait);
        } else {
          init = this.parseForExpressionStatement(node, isAwait);
        }

        if (init.type === _ForInStatement || init.type === _ForOfStatement) {
          return init;
        }
      }

      this.expect(';');

      var test = null;
      if (this.value !== ';') {
        test = this.parseExpression(true);
      }
      this.expect(';');

      var update = null;
      if (this.value !== ')') {
        update = this.parseExpression(true);
      }
      this.expect(')');

      var body = this.parseStatement();

      node.init = init;
      node.test = test;
      node.update = update;
      node.body = body;
      return this.finishNode(node);
    },
    parseForExpressionStatement: function(node, isAwait) {
      var expr = this.parseExpression(false);

      if (this.value === 'in') {
        return this.parseForInStatement(expr, node);
      }

      if (this.value === 'of') {
        return this.parseForOfStatement(expr, node, isAwait);
      }

      return expr;
    },
    parseForVarStatement: function(node, isAwait) {
      var kind = this.value;
      var decl = this.parseVariableStatement(kind, true);

      if (this.value === 'in') {
        return this.parseForInStatement(decl, node);
      }

      if (this.value === 'of') {
        return this.parseForOfStatement(decl, node, isAwait);
      }

      return decl;
    },
    parseForInStatement: function(left, node) {
      node.type = _ForInStatement;
      this.expect('in');

      var right = this.parseExpression(true);
      this.expect(')');

      var body = this.parseStatement();

      node.left = left;
      node.right = right;
      node.body = body;
      node.each = false;
      return this.finishNode(node);
    },
    parseForOfStatement: function(left, node, isAwait) {
      node.type = _ForOfStatement;
      this.expect('of');

      var right = this.parseExpression(true);
      this.expect(')');

      var body = this.parseStatement();

      node.left = left;
      node.right = right;
      node.body = body;
      if (isAwait) {
        node.await = true;
      }
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 16.2.2 Imports
    parseImportDeclaration: function() {
      var node = this.startNode(_ImportDeclaration);

      this.expect('import');
      node.specifiers = this.parseImportClause();

      if (this.value === 'from') {
        this.next();
      }

      this.assertType(_String);
      node.source = this.parseLiteral();
      this.expectSemicolon();

      return this.finishNode(node);
    },
    parseImportClause: function() {
      var specs = [];

      if (this.type === _String) {
        return specs;
      }

      if (this.type === _Identifier) {
        if (this.value === 'from') {
          this.unexpected();
        }

        specs[specs.length] = this.parseImportDefaultSpecifier();
        if (this.value !== ',') {
          return specs;
        }
        this.next();
      }

      if (this.value === '*') {
        specs[specs.length] = this.parseImportNamespaceSpecifier();
        if (this.value !== ',') {
          return specs;
        }
        this.next();
      }

      if (this.value === '{') {
        this.parseCommaSeparatedElements('{', '}', specs,
          this.parseImportSpecifier);
      }

      return specs;
    },
    parseImportSpecifier: function() {
      var node = this.startNode(_ImportSpecifier);
      var imported = this.parseIdentifier();
      var local;

      if (this.value === 'as') {
        this.next();
        local = this.parseIdentifier();
      }

      node.local = local || imported;
      node.imported = imported;
      return this.finishNode(node);
    },
    parseImportNamespaceSpecifier: function() {
      var node = this.startNode(_ImportNamespaceSpecifier);
      this.expect('*');
      this.expect('as');
      node.local = this.parseIdentifier();
      return this.finishNode(node);
    },
    parseImportDefaultSpecifier: function() {
      var node = this.startNode(_ImportDefaultSpecifier);
      node.local = this.parseIdentifier();
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 16.2.3 Exports
    parseExportDeclaration: function() {
      var node = this.startNode();
      this.expect('export');
      var value = this.value;
      if (value === 'default') {
        return this.parseExportDefaultDeclaration(node);
      }

      if (value === '*') {
        return this.parseExportAllDeclaration(node);
      }

      return this.parseExportNamedDeclaration(node);
    },
    parseExportDefaultDeclaration: function(node) {
      node.type = _ExportDefaultDeclaration;
      this.expect('default');

      var expr, skipSemicolon;
      if (this.value === 'function') {
        expr = this.parseFunctionDeclaration();
        skipSemicolon = true;
      } else if (this.isAsyncFunctionAhead()) {
        this.next(); // eat 'async'
        expr = this.parseFunctionDeclaration({ async: true });
        skipSemicolon = true;
      } else {
        expr = this.parseAssignmentExpression(true);
      }

      if (!skipSemicolon) {
        this.expectSemicolon();
      }

      node.declaration = expr;
      return this.finishNode(node);
    },
    parseExportAllDeclaration: function(node) {
      node.type = _ExportAllDeclaration;

      this.expect('*');

      // ES2020: `export * as foo from "mod"`
      if (this.value === 'as') {
        this.next();
        node.exported = this.parseIdentifier(true);
      }

      this.expect('from');
      this.assertType(_String);
      node.source = this.parseLiteral();
      this.expectSemicolon();

      return this.finishNode(node);
    },
    parseExportNamedDeclaration: function(node) {
      node.type = _ExportNamedDeclaration;

      var decl = null;
      var specs = [];
      var source = null;

      if (this.type === _Keyword || this.isAsyncFunctionAhead()) {
        // export var|let|const|function|async function|...
        decl = this.parseStatement();
      } else {
        this.parseCommaSeparatedElements('{', '}', specs,
          this.parseExportSpecifier);

        if (this.value === 'from') {
          this.next();
          this.assertType(_String);
          source = this.parseLiteral();
        }
        this.expectSemicolon();
      }

      node.declaration = decl;
      node.specifiers = specs;
      node.source = source;
      return this.finishNode(node);
    },
    parseExportSpecifier: function() {
      var node = this.startNode(_ExportSpecifier);
      var local = this.parseIdentifier();
      var exported;

      if (this.value === 'as') {
        this.next();
        exported = this.parseIdentifier();
      }

      node.exported = exported || local;
      node.local = local;
      return this.finishNode(node);
    },
    // ECMA-262, 16th: 15.7 Class Definitions
    parseClassDeclaration: function() {
      return this.parseClass();
    },
    parseClassExpression: function() {
      return this.parseClass(true);
    },
    parseClass: function(expression) {
      var node = this.startNode(expression ? _ClassExpression : _ClassDeclaration);
      this.expect('class');

      var id = null;
      // Class definitions are always in strict mode, where `yield` is not
      // allowed, so `isContextualIdentifier()` cannot be used here.
      // `await` is allowed as an identifier outside of async functions.
      if (this.type === _Identifier ||
        (this.value === 'await' && !this.inAsync)) {
        id = this.parseContextualIdentifier();
      }

      var superClass = null;
      if (this.value === 'extends') {
        this.next();
        superClass = this.parseMemberExpression(true);
      }

      node.id = id;
      node.superClass = superClass;
      node.body = this.parseClassBody();
      return this.finishNode(node);
    },
    parseClassBody: function() {
      var node = this.startNode(_ClassBody);
      var body = [];

      this.expect('{');

      while (this.value !== '}') {
        if (this.value === ';') {
          this.next();
          continue;
        }
        body[body.length] = this.parseMethodDefinition();
      }

      this.expect('}');
      node.body = body;
      return this.finishNode(node);
    },
    parseMethodDefinition: function() {
      var startNode = this.startNode(_MethodDefinition);
      var isStatic = false;
      // `static` is the static modifier unless it is itself the method name,
      // e.g. `class A { static() {} }`.
      if (this.value === 'static' && this.lookahead().value !== '(') {
        isStatic = true;
        this.next();
      }

      var node = this.parseObjectDefinition();
      this.startNodeAt(node, startNode);
      node.type = _MethodDefinition;
      node['static'] = isStatic;
      delete node.method;
      delete node.shorthand;

      if (node.key.name === 'constructor') {
        node.kind = 'constructor';
      } else if (node.kind === 'init') {
        node.kind = 'method';
      }

      return this.finishNode(node);
    },
    parseMaybeExpressionStatement: function() {
      var label = this.parseMaybeLabelledStatement();
      if (label) {
        return label;
      }

      var node = this.startNode(_ExpressionStatement);
      var expr = this.parseExpression(true);
      this.expectSemicolon();

      node.expression = expr;
      return this.finishNode(node);
    },
    parseMaybeLabelledStatement: function() {
      if (this.isContextualIdentifier() && this.lookahead().value === ':') {
        var node = this.startNode(_LabeledStatement);
        var label = this.parseContextualIdentifier();

        this.next();
        var body = this.parseStatement();

        node.label = label;
        node.body = body;
        return this.finishNode(node);
      }
    },
    parse: function(source) {
      source = source == null ? '' : '' + source;

      this.tokens = tokenize(source, {
        range: this.options.range,
        loc: this.options.loc,
        parse: true
      });

      this.length = this.tokens.length;
      this.index = -1;
      this.next();

      var program = this.startNode(_Program);
      program.body = [];

      this.parseScriptBody(program.body);
      return this.finishNode(program);
    }
  };

  /**
   * Parse a string source.
   * The result will be an abstract syntax tree (AST) object.
   *
   * @param {string} source Target source.
   * @param {Object} [options] Parse options.
   *   - range: {boolean} (default=false)
   *       Include an index-based location range (array)
   *   - loc: {boolean} (default=false)
   *       Include line number and column-based location info
   * @return {Object} Return an abstract syntax tree object.
   */
  var parse = Chiffon.parse = function(source, options) {
    return new Parser(options).parse(source);
  };

  return Chiffon;
}));
