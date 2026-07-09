// test for line separator (U+2028) and paragraph separator (U+2029) in string literals
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

module.exports = {
  code: `
const a = "both${LS + PS}separators";
const b = 'both${LS + PS}separators';
const c = \`both${LS + PS}separators\`;
const d = ["${LS + PS}", '${LS + PS}', \`${LS + PS}\`];
const e = ["${LS + PS}${LS + PS}", '${LS + PS}${LS + PS}', \`${LS + PS}${LS + PS}\`];
`
};
