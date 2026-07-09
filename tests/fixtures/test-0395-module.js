// test for paragraph separator (U+2029) in string literals
const PS = String.fromCharCode(0x2029);

module.exports = {
  code: `
const a = "para${PS}sep";
const b = 'para${PS}sep';
const c = \`para${PS}sep\`;
const d = ["${PS}", '${PS}', \`${PS}\`];
const e = ["${PS}${PS}", '${PS}${PS}', \`${PS}${PS}\`];
`
};
