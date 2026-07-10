// test for comment tokens with `comment: true` option
module.exports = {
  code: `const url = 'https://example.com/path'; // trailing, not //example
const re = /ab+c/g; // a real regex, then a comment with /slashes/
/* block with "quotes", 'apostrophes' and a fake /* open */
const ok = re.test(url); // done
`,
  options: { comment: true }
};
