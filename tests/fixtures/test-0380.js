const errors = [];
try {
  undefinedFunc();
} catch ({ message }) {
  errors.push(message);
}

try {
  throw new Error('err');
} catch ({ name = 'Error', stack }) {
  errors.push([name, stack]);
}

try {
  throw ['first', 'second'];
} catch ([first]) {
  errors.push(first);
}
