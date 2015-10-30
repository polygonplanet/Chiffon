Chiffon
=======

[![Build Status](https://travis-ci.org/polygonplanet/Chiffon.svg?branch=master)](https://travis-ci.org/polygonplanet/Chiffon)

A very small ECMAScript parser, tokenizer and minifier written in JavaScript.

`chiffon.min.js` is **7KB** now.


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

Tokenize a string source.

* {_Array_} Chiffon.**tokenize** ( source [, options ] )  
  @param {_string_} _source_ Target source.  
  @param {_Object_} [_options_] [Tokenize options](#tokenize-options).  
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
* WhiteSpace
* LineTerminator
* Template
* String
* Punctuator
* RegularExpression
* Numeric
* Identifier
* Null
* Boolean
* Keyword


### Tokenize Options

* **comment** : {boolean} default=false  
  Keep comment tokens.

* **whiteSpace** : {boolean} default=false  
  Keep white space tokens.

* **lineTerminator** : {boolean} default=false  
  Keep line terminator tokens.

* **range** : {boolean} default=false  
  Include an index-based location range. (array)

* **loc** : {boolean} default=false  
  Include line number and column-based location info.


Full options are following.

```javascript
var options = {
  comment: Boolean,
  whiteSpace: Boolean,
  lineTerminator: Boolean,
  range: Boolean,
  loc: Boolean
};
```

## Untokenize

Concatenate to string from the parsed tokens.

* {_string_} Chiffon.**untokenize** ( tokens )  
  @param {_Array_} _tokens_ An array of the parsed tokens.  
  @param {_Object_} [_options_] [Untokenize options](#untokenize-options).  
  @return {_string_}  Return a concatenated string.  


### Untokenize Options

* **unsafe** : {boolean} (default=false)  
  Untokenizer does not add a space between the identifier and identifier.


Tokens can return to the original string by using the untokenize with these options.

```javascript
var source = 'var a = 1, b = 2; // comment';
var tokens = Chiffon.tokenize(source, {
  comment: true,
  whiteSpace: true,
  lineTerminator: true
});

var result = Chiffon.untokenize(tokens, { unsafe: true });
console.log(result === source); // true
```


## Minify

Minify JavaScript source.

* {_string_} Chiffon.**minify** ( source )  
  @param {_string_} _source_ Target source.  
  @param {_Object_} [_options_] [minify options](#minify-options).  
  @return {_string_} Return a minified source.  


```javascript
var min = Chiffon.minify('var a = 1 + 1; // comment');
console.log(min); // 'var a=1+1;'
```

### Minify Options

* **maxLineLen** : {number} default=32000  
  Limit the line length in symbols.


## Demo

* [Demo](https://polygonplanet.github.io/Chiffon/demo/javascript-parser-demo.html)

## License

MIT

