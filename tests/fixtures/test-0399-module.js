// test for zero width non-break space (U+FEFF, also used as a BOM)
const ZWNBSP = String.fromCharCode(0xFEFF);
const SPACE = String.fromCharCode(0x20);
const TAB = String.fromCharCode(0x09);

module.exports = {
  code: `${ZWNBSP}var${ZWNBSP}counter${ZWNBSP}=${ZWNBSP}0;
let${SPACE}step${TAB}=${SPACE}1;
counter${ZWNBSP}+=${ZWNBSP}step;
`,
  options: { whiteSpace: true }
};
