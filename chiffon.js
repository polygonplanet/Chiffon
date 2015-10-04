/**
 * Chiffon
 *
 * @description  Small JavaScript Parser
 * @fileoverview JavaScript parser library
 * @version      1.0.0
 * @date         2015-10-05
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


  var keywords = makeDict(
    // ECMA-262 11.6.2.1 Keywords
    'break do in typeof case else instanceof var ' +
    'catch export new void class extends return while const finally ' +
    'super with continue for switch yield debugger function this default ' +
    'if throw delete import try ' +
    'null true false ' +
    'arguments eval ' +
    // ECMA-262 11.6.2.2 Future Reserved Words
    'enum await ' +
    'implements package protected interface private public'
  );


  var parseRe = new RegExp(
    '(' + '/[*][\\s\\S]*?[*]/' + // multiline comment
    '|' + '/{2,}[^\\r\\n]*(?:\\r\\n|\\r|\\n|)' + // single line comment
    '|' + '(' + '`(?:\\\\[\\s\\S]|[^`\\\\])*`' + // (2) template literal
          ')' +
    '|' + '(' + '"(?:\\\\[\\s\\S]|[^"\\r\\n\\\\])*"' + // (3) string literal
          '|' + "'(?:\\\\[\\s\\S]|[^'\\r\\n\\\\])*'" +
          ')' +

    '|' + '(' + '^' + // (4) regexp literal prefix
          '|' + '[-!%&*+,/:;<=>?[{(^|~]' +
          ')' +
          '(?:' +
              '(' + // (5) line feed
                '(?!' + '[\\r\\n])\\s+' +
                  '|' + '(?:\\r\\n|\\r|\\n)' +
               ')' +
            '|' + '\\s*' +
          ')' +
          '(?:' +
            '(' + // (6) regular expression literal
                '(?:/(?![*])(?:\\\\.|[^/\\r\\n\\\\])+/)' +
                '(?:[gimuy]{0,5}|\\b)' +
            ')' +
            '(?=\\s*' +
              '(?:' + '(?!\\s*[/\\\\<>*+%`^"\'\\w$-])' +
                      '[^/\\\\<>*+%`^\'"@({[\\w$-]' +
                '|' + '===?' +
                '|' + '!==?' +
                '|' + '[|][|]' +
                '|' + '[&][&]' +
                '|' + '/(?:[*]|/)' +
                '|' + '[,.;:!?)}\\]\\r\\n]' +
                '|' + '$' +
              ')' +
            ')' +
          ')' +
    '|' + '(' + 'instanceof|return|typeof' + // (7) operators
          '|' + 'delete|throw|case|void|new|in' +
          '|' + '>>>=?|[.][.][.]|<<=|===|!==|>>=' +
          '|' + '[+][+](?=[+])|[-][-](?=[-])' +
          '|' + '[=!<>*%+/&|^-]=' +
          '|' + '[&][&]|[|][|]|[+][+]|[-][-]|<<|>>|=>' +
          '|' + '[-+*/%<>=&|^~!?:,.()[\\]{}]' +
          ')' +
    '|' + '(' + '0(?:' + '[xX][0-9a-fA-F]+' + // (8) numeric literal
                   '|' + '[oO]?[0-7]+' +
                   '|' + '[bB][01]+' +
                   ')' +
          '|' + '\\d+(?:[.]\\d+)?(?:[eE][+-]?\\d+)?' +
          '|' + '[1-9]\\d*' +
          ')' +
    '|' + '(' + '\\u[0-9a-fA-F]{4}' + // (9) unicode character
          ')' +
    '|' + ';' +
    '|' + '(?:(?![\\r\\n])\\s)+' + // white space
    '|' + '(?:\\r\\n|\\r|\\n)' + // line feed
    '|' + '(' + '[^\\s+/%*=&|^~<>!?:,;()[\\].{}\'"-]+' + // (10) identifier
          ')' +
    ')',
    'g'
  );


  var tokenKeys = {
    2: { name: 'TemplateLiteral' },
    3: { name: 'String' },
    4: { name: 'Punctuator' },
    5: { name: 'LineFeed', ignore: true },
    6: { name: 'RegularExpression' },
    7: { name: 'Punctuator' },
    8: { name: 'Numeric' },
    9: { name: 'UnicodeEscapeSequence' },
    10: { name: 'Identifier', keywords: true }
  };

  var tokenKeyNumbers = getKeys(tokenKeys);


  function getToken(match) {
    for (var i = 0, len = tokenKeyNumbers.length; i < len; i++) {
      var n = tokenKeyNumbers[i];
      var token = match[n];
      if (!token) {
        continue;
      }

      var tokenKey = tokenKeys[n];
      if (tokenKey.ignore) {
        continue;
      }

      var type;
      if (tokenKey.keywords && hasOwnProperty.call(keywords, token)) {
        type = 'Keyword';
      } else {
        type = tokenKey.name;
      }

      return {
        type: type,
        token: token
      };
    }
  }


  function parse(code) {
    var tokens = [];
    var m;

    parseRe.lastIndex = 0;
    while ((m = parseRe.exec(code)) != null) {
      var token = getToken(m);
      if (token) {
        tokens[tokens.length] = token;
      }
    }

    return tokens;
  }

  Chiffon.parse = parse;


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


  function makeDict(string) {
    var dict = {};
    var words = string.split(/\s+/);
    for (var i = 0, len = words.length; i < len; i++) {
      dict[words[i]] = true;
    }
    return dict;
  }


  return Chiffon;
}));
