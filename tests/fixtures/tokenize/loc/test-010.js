// CRLF
var a = 'a', b = 'b';
/*
comment
*/
var t = `aaa${
  a
} bbb ${
/a/.test(b.toString()) ? 1 : 2
} ccc`;

var t2 = `t2`;
var t3 = `
`;
var t4 = ``, t5 = `${a}
`, t6 = `
${a} ${b} ${a+b}
${a+b}
${b+b}`;

var t7 = `\${a}`;
var t8 = `\\${a}`;
var t9 = `$\{a}`;
var t10 = `${a}\`a`;
var t11 = `${
a+a}`;
var t12 = `${a+a
}`;
var t13 = `${
a+a
}`;
var t14 = `
${
a+a
}
`;

var x = 1;
