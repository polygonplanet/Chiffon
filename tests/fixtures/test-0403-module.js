// test for line terminators with `lineTerminator: true` option
const LF = String.fromCharCode(0x0A);
const CR = String.fromCharCode(0x0D);
const CRLF = CR + LF;

module.exports = {
  code: `var a = 1;${LF}var b = 2;${CRLF}var c = 3;${CR}var d = a + b + c;${LF}`,
  options: { lineTerminator: true }
};
