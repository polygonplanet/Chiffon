// test for comment tokens with `comment: true` option
module.exports = {
  code: `#!/usr/bin/env node
'use strict';
// configure the worker pool
const size = 4; /* default */ const timeout = 1000;
/*
 * a multi-line
 * block comment
 */
function scale(n) {
  return n * size; // scale by the pool size
}
scale(timeout);
`,
  options: { comment: true }
};
