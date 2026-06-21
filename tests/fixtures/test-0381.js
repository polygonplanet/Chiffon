let count = 0;

try {
  try {
    count++;
    null.value;
  } catch {
    count++;
    undefined.value;
  }
} catch (e) {
  try {
    throw new Error('err');
  } catch {
    count++;
  }
} finally {
  count++;
}
