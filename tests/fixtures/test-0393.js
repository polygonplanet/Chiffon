class C {
  static b = [];
  static #a;

  static {
    C.#a = true;
    C.b.push('dummy');
  }

  static f() {
    return C.#a === true;
  }
}

const r = C.f();
const n = C.b.length;

class D {
  static() {}
  static c = '{}';
  static #d = {};
  static {}
}

new D();
