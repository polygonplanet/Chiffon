Chiffon
=======

[![Build Status](https://travis-ci.org/polygonplanet/Chiffon.svg?branch=master)](https://travis-ci.org/polygonplanet/Chiffon)

A very small ECMAScript parser, tokenizer and minify written in JavaScript.

`chiffon.min.js` is **3KB** now.

## Installation

### In Browser:

```html
<script src="chiffon.js"></script>
```

or

```html
<script src="chiffon.min.js"></script>
```

Object **Chiffon** will defined in the global scope.


### In Node.js:

```bash
npm install chiffon
```

```javascript
var Chiffon = require('chiffon');
```

### bower:

```bash
bower install chiffon
```

## Tokenize

Tokenize a string code.

* {_Array_} Chiffon.**tokenize** ( code [, options ] )  
  @param {_string_} _code_ Target code.  
  @param {_Object_} [_options_] Tokenize options.  
  @return {_Array_}  Return an array of the parsed tokens.  


```javascript
var tokens = Chiffon.tokenize('var a = 1');
console.log(tokens);
/*
[ { type: 'Keyword',    value: 'var' },
  { type: 'Identifier', value: 'a' },
  { type: 'Punctuator', value: '=' },
  { type: 'Numeric',    value: '1' } ]
*/
```

JavaScript AST is not currently supported.

Chiffon work simply tokenizing.


### Defined token type

* Comment
* LineTerminator
* Template
* String
* Punctuator
* RegularExpression
* Numeric
* UnicodeEscapeSequence
* Identifier
* Null
* Boolean
* Keyword


### Options

* **comment** : {boolean} default=false  
  Keep comment tokens.

* **lineTerminator** : {boolean} default=false  
  Keep line terminator tokens.

* **range** : {boolean} default=false  
  Includes an index-based location range (array)


## Untokenize

Concatenate to string from the parsed tokens.

* {_string_} Chiffon.**untokenize** ( tokens )  
  @param {_Array_} _tokens_ An array of the parsed tokens.  
  @return {_string_}  Return a concatenated string.  


## Minify

Minify JavaScript code.

* {_string_} Chiffon.**minify** ( code )  
  @param {_string_} _code_ Target code.  
  @return {_string_} Return a minified code.  


```javascript
var min = Chiffon.minify('var a = 1 + 1; // comment');
console.log(min); // var a=1+1;
```


Minify is a simple implementation as following.


```javascript
function minify(code) {
  return untokenize(tokenize(code, { lineTerminator: true }));
}
```

## Demo

* [Demo](https://polygonplanet.github.io/Chiffon/demo/javascript-parser-demo.html)

## License

MIT

