// test for line terminators with `lineTerminator: true` option
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

module.exports = {
  code: `var a = 1;${LS}var b = 2;${PS}var c = a + b;
--> html close comment
var d = c;
`,
  options: { lineTerminator: true }
};
