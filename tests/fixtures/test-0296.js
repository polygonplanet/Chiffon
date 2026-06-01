const a = { b: 1, c: 2 };
const o = { ...a };
const p = { x: 1, ...a, y: 2 };
const f = () => {};
const q = { ...f() };