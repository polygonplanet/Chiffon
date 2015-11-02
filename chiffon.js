/**
 * Chiffon
 *
 * @description  A small ECMAScript parser, tokenizer and minifier written in JavaScript
 * @fileoverview JavaScript parser, tokenizer and minifier library
 * @version      2.0.1
 * @date         2015-11-02
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
            // (10) whitespace
      '|' + '(' + whiteSpace + ')' +
            // (11) line terminators
      '|' + '(' + lineTerminatorSequence + ')' +
            // (12) identifier
      '|' + '(' + (ignore === _Template ? '[\\s\\S]' : identToken) +
            ')' +
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

        if (!type) {
          continue;
        }

        if (this.options.parse && type === _LineTerminator) {
          hasLineTerminator = true;
          continue;
        }

        if ((type === _Comment && !this.options.comment) ||
            (type === _WhiteSpace && !this.options.whiteSpace) ||
            (type === _LineTerminator && !this.options.lineTerminator)) {
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

        if (this.options.range) {
          token.range = [this.index - len, this.index];
        }
        if (this.options.loc) {
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

          ch = c.charCodeAt(0);
          if (ch === 0x20 || ch === 0x09 || whiteSpaceRe.test(c)) {
            return _WhiteSpace;
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

  Chiffon.Tokenizer = Tokenizer;

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

  Chiffon.Untokenizer = Untokenizer;

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

  Chiffon.Minifier = Minifier;

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
      _ArrayExpression = 'ArrayExpression',
      _BlockStatement = 'BlockStatement',
      _BinaryExpression = 'BinaryExpression',
      _BreakStatement = 'BreakStatement',
      _CallExpression = 'CallExpression',
      _CatchClause = 'CatchClause',
      _ConditionalExpression = 'ConditionalExpression',
      _ContinueStatement = 'ContinueStatement',
      _DoWhileStatement = 'DoWhileStatement',
      _DebuggerStatement = 'DebuggerStatement',
      _EmptyStatement = 'EmptyStatement',
      _ExpressionStatement = 'ExpressionStatement',
      _ForStatement = 'ForStatement',
      _ForOfStatement = 'ForOfStatement',
      _ForInStatement = 'ForInStatement',
      _FunctionDeclaration = 'FunctionDeclaration',
      _FunctionExpression = 'FunctionExpression',
      _IfStatement = 'IfStatement',
      _Literal = 'Literal',
      _LabeledStatement = 'LabeledStatement',
      _LogicalExpression = 'LogicalExpression',
      _MemberExpression = 'MemberExpression',
      _NewExpression = 'NewExpression',
      _ObjectExpression = 'ObjectExpression',
      _ObjectPattern = 'ObjectPattern',
      _Program = 'Program',
      _Property = 'Property',
      _ReturnStatement = 'ReturnStatement',
      _SequenceExpression = 'SequenceExpression',
      _SpreadElement = 'SpreadElement',
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
      _WithStatement = 'WithStatement';


  var assignOpRe = /^(?:[-+*%\/&|]?=|>>>?=|<<=)$/;
  var unaryOpRe = /^(?:[-+!~]|\+\+|--|typeof|void|delete)$/;
  var octalDigitRe = /^0[0-7]+$/;


  function Node() {}


  function Parser(options) {
    this.options = mixin({}, options || {});
  }

  Parser.prototype = {
    next: function() {
      this.index++;
      return this.current();
    },
    current: function() {
      this.token = this.tokens[this.index] || TOKEN_END;
      this.value = this.token.value;
      this.type = this.token.type;
      this.lookahead = this.tokens[this.index + 1] || TOKEN_END;
      return this.token;
    },
    hasNext: function() {
      return this.index < this.length;
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
      this.assertValue(value);
      this.next();
    },
    expectType: function(type) {
      this.assertType(type);
      this.next();
    },
    expectSemicolon: function() {
      if (this.value === ';') {
        this.next();
        return true;
      }

      if (this.token.hasLineTerminator ||
          this.value === '}' || !this.hasNext()) {
        return true;
      }

      this.unexpected();
    },
    unexpected: function() {
      var token = this.value || '';
      if (token.length > 10) {
        token = token.substr(0, 10) + '...';
      }
      this.throwError("Unexpected token '" + token + "'");
    },
    throwError: function(message) {
      var loc = this.token.loc;
      if (loc) {
        message += ' at line ' + loc.start.line + ' column ' + loc.start.column;
      }
      throw new Error(message);
    },
    startNode: function(type) {
      var node = new Node();
      this.startNodeAt(node);
      node.type = type;
      return node;
    },
    finishNode: function(node) {
      if (this.lastGroup && this.lastGroup.expr === node) {
        // Restore the held position
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
        node.range = [startNode.range[0]];
      }

      if (this.options.loc) {
        var loc = startNode.loc;
        node.loc = {
          start: {
            line: loc.start.line,
            column: loc.start.column
          }
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
    // ECMA-262 11.8.3 Numeric Literals
    parseNumeric: function(value) {
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
    // ECMA-262 11.8.4 String Literals
    parseString: function(value) {
      var s = '';
      var i = 1;
      var len = value.length - 1;
      var c, c2, ch, hex, n, index, length;

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
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
              n = c;
              do {
                c = value.charAt(i);
                if (c < '0' || c > '7') {
                  break;
                }
                n += c;
              } while (i++ < len && n.length < 3);

              if (n.length > 0 && n.charAt(0) === '0') {
                n = n.substring(1);
              }
              c = fromCharCode(parseInt(n, 8));
              break;
          }
        }
        s += c;
      }

      return s;
    },
    parseLiteral: function() {
      var node = this.startNode(_Literal);
      var raw = this.value;
      var value, regex;

      switch (this.type) {
        case _Numeric:
          value = this.parseNumeric(raw);
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
          regex = regex;
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
    // ECMA-262 12.2 Primary Expression
    parsePrimaryExpression: function() {
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
        default:
          this.unexpected();
      }
    },
    parsePrimaryKeywordExpression: function() {
      switch (this.value) {
        case 'function':
          return this.parseFunctionExpression();
        case 'this':
          return this.parseThisExpression();
      }

      this.unexpected();
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
        default:
          this.unexpected();
      }
    },
    parseGroupExpression: function() {
      this.expect('(');
      var node = this.startNode();
      var expr = this.parseExpression(true);

      // Hold the current position for expression
      this.lastGroup = {
        expr: expr,
        startNode: node,
        endToken: this.tokens[this.index - 1]
      };

      this.expect(')');
      return expr;
    },
    // ECMA-262 12.2.6 Object Initializer
    parseObjectInitializer: function() {
      var node = this.startNode(_ObjectExpression);
      var props = [];

      this.expect('{');

      while (this.value !== '}' && this.hasNext()) {
        props[props.length] = this.parseObjectDefinition();
      }

      this.expect('}');

      node.properties = props;
      return this.finishNode(node);
    },
    parseObjectDefinition: function() {
      var node;

      if (this.value === 'get' || this.value === 'set') {
        node = this.parseObjectGetterSetter();
      } else {
        node = this.parseObjectProperty();
      }

      if (this.value !== '}') {
        this.expect(',');
      }

      return node;
    },
    parseObjectProperty: function() {
      var node = this.startNode(_Property);
      var key = this.parseObjectPropertyName();
      var value;

      if (this.value === ':') {
        this.next();
        value = this.parseAssignmentExpression(true);
      } else if (this.value === '(') {
        value = this.parseFunction({ expression: true });
      } else {
        this.unexpected();
      }

      node.key = key;
      node.value = value;
      node.kind = 'init';
      return this.finishNode(node);
    },
    parseObjectGetterSetter: function() {
      var node = this.startNode(_Property);
      var kind = 'init';
      var key, value;

      if (this.lookahead.value === ':') {
        key = this.parseObjectPropertyName();
        this.next();
        value = this.parseAssignmentExpression(true);
      } else if (this.lookahead.value === '(') {
        key = this.parseObjectPropertyName();
        value = this.parseFunction({ expression: true });
      } else {
        var prev = this.value;

        this.next();
        if (this.type === _Identifier || this.type === _Keyword ||
            this.type === _String || this.type === _Numeric) {
          kind = prev;
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
      node.value = value;
      node.kind = kind;
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
    // ECMA-262 12.2.5 Array Initializer
    parseArrayInitializer: function() {
      var node = this.startNode(_ArrayExpression);
      var elems = [];

      this.expect('[');

      while (this.value !== ']' && this.hasNext()) {
        if (this.value === ',') {
          this.next();
          elems[elems.length] = null;
          continue;
        }
        elems[elems.length] = this.parseAssignmentExpression(true);

        if (this.value !== ']') {
          this.expect(',');
        }
      }

      this.expect(']');

      node.elements = elems;
      return this.finishNode(node);
    },
    // ECMA-262 A.2 Expressions
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
    parseAssignmentExpression: function(allowIn) {
      var node = this.startNode(_AssignmentExpression);
      var left = this.parseConditionalExpression(allowIn);
      if (!assignOpRe.test(this.value)) {
        return left;
      }

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
        default:
          return 0;
      }
    },
    parseBinaryExpression: function(allowIn, base) {
      if (base == null) {
        base = 10;
      }

      var startNode = this.startNode();
      var left = this.parseUnaryExpression();
      var prec = this.getBinaryPrecedence(allowIn);
      if (!prec) {
        return left;
      }
      var right, operator, node;

      for (var i = 1; i <= 10; i++) {
        while ((prec = this.getBinaryPrecedence(allowIn)) === i) {
          operator = this.value;

          node = this.startNode(i < 9 ? _BinaryExpression : _LogicalExpression);
          this.startNodeAt(node, startNode);
          node.operator = operator;
          node.left = left;

          this.next();

          if (prec === 1) {
            right = this.parseUnaryExpression();
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
    parseUnaryExpression: function() {
      var value = this.value;
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

      if (this.value === 'new') {
        expr = this.parseNewExpression();
      } else {
        expr = this.parsePrimaryExpression();
      }

      while (this.hasNext()) {
        if (this.value === '.') {
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

      return expr;
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
    parseCallExpression: function(expr, startNode) {
      var node = this.startNode(_CallExpression);
      this.startNodeAt(node, startNode);

      node.callee = expr;
      node.arguments = [];
      this.parseArguments(node);
      return this.finishNode(node);
    },
    parseComputedMember: function(expr, startNode) {
      var node = this.startNode(_MemberExpression);
      this.startNodeAt(node, startNode);
      this.next();

      node.computed = true;
      node.object = expr;
      node.property = this.parseExpression(true);

      this.expect(']');
      return this.finishNode(node);
    },
    parseNonComputedMember: function(expr, startNode) {
      var node = this.startNode(_MemberExpression);
      this.startNodeAt(node, startNode);
      this.next();

      node.computed = false;
      node.object = expr;
      node.property = this.parseIdentifier();
      return this.finishNode(node);
    },
    parseArguments: function(node) {
      var args = node.arguments;

      this.next();
      while (this.value !== ')' && this.hasNext()) {
        args[args.length] = this.parseAssignmentExpression(true);
        if (this.value !== ')') {
          this.expect(',');
        }
      }

      this.next();
      return node;
    },
    parseTemplateLiteral: function() {
      var node = this.startNode(_TemplateLiteral);
      var quasi = this.parseTemplateElement();
      var quasis = [quasi];
      var exprs = [];

      while (!quasi.tail && this.hasNext()) {
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

      var c = this.value.charAt(0);
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
    // ECMA-262 13 ECMAScript Language: Statements and Declarations
    parseStatement: function() {
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
        case 'switch':
          return this.parseSwitchStatement();
        case 'do':
          return this.parseDoWhileStatement();
        case 'while':
          return this.parseWhileStatement();
        case 'for':
          return this.parseForStatement();
        default:
          return this.parseMaybeExpressionStatement();
      }
    },
    parseScriptBody: function(body, end) {
      while (this.value !== end && this.hasNext()) {
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
    // ECMA-262 13.3.2 Variable Statement
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
      var id = this.parseIdentifier();
      var init = null;

      if (this.value === '=') {
        this.next();
        init = this.parseAssignmentExpression(allowIn);
      }

      node.id = id;
      node.init = init;
      return this.finishNode(node);
    },
    // ECMA-262 14.1 Function Definitions
    parseFunctionDeclaration: function() {
      var node = this.startNode();
      this.expect('function');
      return this.parseFunction({ node: node });
    },
    parseFunctionExpression: function() {
      var node = this.startNode();
      this.expect('function');
      return this.parseFunction({ node: node, expression: true });
    },
    parseFunction: function(options) {
      options = options || {};

      var node = options.node || this.startNode();
      node.type = options.expression ? _FunctionExpression : _FunctionDeclaration;
      node.id = null;
      node.params = [];
      node.defaults = [];
      node.body = null;
      node.generator = !!options.generator;
      node.expression = false;

      if (options.getter) {
        this.expect('(');
        this.expect(')');
      } else if (options.setter) {
        this.parseParams(node);
      } else {
        if (this.type === _Identifier) {
          node.id = this.parseIdentifier();
        }
        this.parseParams(node);
      }

      node.body = this.parseBlockStatement();
      return this.finishNode(node);
    },
    parseParams: function(node) {
      var params = node.params;

      this.expect('(');
      while (this.value !== ')' && this.hasNext()) {
        params[params.length] = this.parseIdentifier();
        if (this.value !== ')') {
          this.expect(',');
        }
      }

      this.expect(')');
    },
    // ECMA-262 13 Statements and Declarations
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

      if (this.type === _Identifier && !this.token.hasLineTerminator) {
        label = this.parseIdentifier();
      }

      this.expectSemicolon();
      node.label = label;
      return this.finishNode(node);
    },
    parseBreakStatement: function() {
      var node = this.startNode(_BreakStatement);
      this.expect('break');

      var label = null;

      if (this.type === _Identifier && !this.token.hasLineTerminator) {
        label = this.parseIdentifier();
      }

      this.expectSemicolon();
      node.label = label;
      return this.finishNode(node);
    },
    parseReturnStatement: function() {
      var node = this.startNode(_ReturnStatement);
      this.expect('return');

      var argument = null;

      if (!this.token.hasLineTerminator &&
          this.value !== ';' && this.value !== '}' && this.hasNext()) {
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
      node.guardedHandlers = [];
      node.handler = handler;
      node.finalizer = finalizer;
      return this.finishNode(node);
    },
    parseCatchClause: function() {
      var node = this.startNode(_CatchClause);
      this.expect('catch');
      this.expect('(');

      var param = this.parseIdentifier();
      this.expect(')');

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

      while (this.value !== '}' && this.hasNext()) {
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
             this.value !== 'default' && this.hasNext()) {
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
      this.expect('(');

      var init = null;

      if (this.value !== ';') {
        if (this.value === 'var' || this.value === 'let' || this.value === 'const') {
          init = this.parseForVarStatement(node);
        } else {
          init = this.parseForExpressionStatement(node);
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
    parseForExpressionStatement: function(node) {
      var expr = this.parseExpression(false);

      if (this.value === 'in') {
        return this.parseForInStatement(expr, node);
      }

      if (this.value === 'of') {
        return this.parseForOfStatement(expr, node);
      }

      return expr;
    },
    parseForVarStatement: function(node) {
      var kind = this.value;
      var decl = this.parseVariableStatement(kind, true);

      if (this.value === 'in') {
        return this.parseForInStatement(decl, node);
      }

      if (this.value === 'of') {
        return this.parseForOfStatement(decl, node);
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
    parseForOfStatement: function(left, node) {
      node.type = _ForOfStatement;
      this.expect('of');

      var right = this.parseExpression(true);
      this.expect(')');

      var body = this.parseStatement();

      node.left = left;
      node.right = right;
      node.body = body;
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
      if (this.type === _Identifier && this.lookahead.value === ':') {
        var node = this.startNode(_LabeledStatement);
        var label = this.parseIdentifier();

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
      this.index = 0;
      this.current();

      var program = this.startNode(_Program);
      program.body = [];

      this.parseScriptBody(program.body);
      return this.finishNode(program);
    }
  };

  Chiffon.Parser = Parser;

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
