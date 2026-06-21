let errorCount = 0;
try {
  undefinedFunc();
} catch {
  errorCount++;
}

try {
  throw new Error();
} catch {
} finally {
  void 0;
}
