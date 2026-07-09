// test for line separator (U+2028) in string literals
const LS = String.fromCharCode(0x2028);

module.exports = {
  code: `
const a = "line${LS}sep";
const b = 'line${LS}sep';
const c = \`line${LS}sep\`;
const d = ["${LS}", '${LS}', \`${LS}\`];
const e = ["${LS}${LS}", '${LS}${LS}', \`${LS}${LS}\`];
`
};
