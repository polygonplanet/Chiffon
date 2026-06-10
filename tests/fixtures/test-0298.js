let a, rest, x, y;
const o = { a: 1, b: 2, c: 3, d: 4 };
({ a, ...rest } = o);
const z = [{ x: 10, y: 20, z: 30 }, { e: 40 }];
[{ x, ...y }] = z;