function* a() {
  yield* function*() {
    yield* 1;
  };
}