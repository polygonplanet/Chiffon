/* comment */
<!-- HTML-like comment
--> HTML-like comment

var regex = /[\/\\"']*/g;
var str = 'string';
var str2 = "str\"i'ng";
var multilineString = "aaa\"bbb'\
ccc";

// 'comment'
var array = [
  0, 42, 12345, -1, -1.1, -0.1, 864e5, .5, 1., 1.e2, 1.e+1,
  -1.4142135623730951, 3.141592653589793,
  0.0314e-1, 0.0314E+2, .0314e-1, .0314E+2,
  0x0FFF, 0X7ffffffF, 0b101010, 0B101010, 0o777, 0O777
];

var a0 = 0, a1 = 1;
var a2 = a0+a1+1;

var template = `
aaa
bbb
ccc
\`escaped
`;

var i = 0;
var もじ = '/*"もじ"*/';
var a = 1 && 2 || 3;

var i = 0;
var g = 1;
var n = (i+++i)/1/g;
