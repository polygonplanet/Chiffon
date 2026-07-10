// test for HTML-like comments with `comment: true` option
module.exports = {
  code: `<!-- legacy: hide from old browsers
var a = 1;
var b = a + 2; <!-- open comment runs to end of line
var c = a + b;
//-->
`,
  options: { comment: true }
};
