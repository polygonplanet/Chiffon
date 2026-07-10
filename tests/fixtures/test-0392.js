class C {
  #a = 0;
  #b;

  constructor(x) {
    this.#b = x;
  }

  #m() {
    this.#a += this.#b;
    return this.#a;
  }

  f() {
    return this.#m();
  }

  static g(o) {
    // `o?.#a` is valid ES2022 syntax, but editor's TypeScript throws TS18030
    return #a in o ? o?.#a : null;
  }
}

const r = [];
const c = new C(2);
r.push(c.f());
r.push(c.f());
r.push(C.g(c));
r.push(C.g({}));

const s = '#!dummyText';
const k = { '#notPrivateField': 1, '#!dummyField': 2 };
const v = k['#notPrivateField'] + `${s}#!`.length;
