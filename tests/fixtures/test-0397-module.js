// test for whitespace tokens:
// tab (U+0009), vertical tab (U+000B), form feed (U+000C)
// and non-break space (U+00A0)
const TAB = String.fromCharCode(0x09);
const VT = String.fromCharCode(0x0B);
const FF = String.fromCharCode(0x0C);
const NBSP = String.fromCharCode(0xA0);

module.exports = {
  code: `
var${TAB}sum${TAB}=${TAB}1${TAB}+${TAB}2;
let${VT}greeting${VT}=${VT}'hello';
const${FF}nums${FF}=${FF}[1,${FF}2,${FF}3];
function${NBSP}identity(x)${NBSP}{${NBSP}return${NBSP}x;${NBSP}}
`,
  options: { whiteSpace: true }
};
