// test for Unicode space separators treated as whitespace:
// ogham space mark (U+1680), en quad / em space / thin space
// (U+2000, U+2003, U+2009), narrow and medium mathematical spaces
// (U+202F, U+205F) and the ideographic (full-width) space (U+3000)
const OGHAM = String.fromCharCode(0x1680);
const EN_QUAD = String.fromCharCode(0x2000);
const EM_SPACE = String.fromCharCode(0x2003);
const THIN_SPACE = String.fromCharCode(0x2009);
const NNBSP = String.fromCharCode(0x202F);
const MMSP = String.fromCharCode(0x205F);
const IDEOGRAPHIC = String.fromCharCode(0x3000);

module.exports = {
  code: `
var${OGHAM}a${OGHAM}=${OGHAM}1;
let${EN_QUAD}b${EM_SPACE}=${THIN_SPACE}b${THIN_SPACE}||${THIN_SPACE}2;
const${NNBSP}total${MMSP}=${IDEOGRAPHIC}a${IDEOGRAPHIC}+${IDEOGRAPHIC}b;
`,
  options: { whiteSpace: true }
};
