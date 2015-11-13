function* a() {
  yield function*() {
    return function*() {
      yield 1;
    };
  };
}