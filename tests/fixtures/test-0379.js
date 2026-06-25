let err = null;

try {
  throw 'error';
} catch (e) {
  err = e;
} finally {}

try {
  throw '';
} catch {} finally {}
