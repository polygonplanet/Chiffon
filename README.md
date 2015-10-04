Chiffon
=======

[![Build Status](https://travis-ci.org/polygonplanet/Chiffon.svg?branch=master)](https://travis-ci.org/polygonplanet/Chiffon)

Simple JavaScript/ECMAScript Parser in JavaScript.

Very small library `chiffon.min.js` is **2KB** now.

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

## Parse

* {_Array_} Chiffon.**parse** ( code )  
  @param {_string_} _code_ Target script code  
  @return {_Array_}  Return an array of tokens  


```javascript
var tokens = Chiffon.parse('var a = 1');
console.log(tokens);
/*
[ { type: 'Keyword',    token: 'var' },
  { type: 'Identifier', token: 'a' },
  { type: 'Punctuator', token: '=' },
  { type: 'Numeric',    token: '1' } ]
*/
```

JavaScript AST is not currently supported.

Chiffon work simply parse code.

## Demo

* [Demo](http://polygonplanet.github.io/Chiffon/demo/javascript-parser-demo.html)

## License

MIT

