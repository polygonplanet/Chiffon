const a = [
  1n, 0n, -0n, -1n, -12n,
  0xFFn, 0xffffn, 0o777n, 0o666n, 0o7n,
  0b10001n, 0b1, 0b0, 0b00n,
  0b000000000, 0b000000000n,
  0,
];

try {
  const typeError = +1n;
} catch (e) {}

const b = !12n;
const c = !0n;
const d = [
  9007199254740991n,
  9007199254740991,
  0x1fffffffffffffn,
  0o377777777777777777n,
  0b11111111111111111111111111111111111111111111111111111n
];

const sep = [
  1_000n, 1_000_000n, 1_0_0_0n,
  123_456_789n,
  0xFF_FFn, 0xabcd_ef01n,
  0b1010_1010n, 0o7_7_7n,
  1_000, 1_000.000_5, 1_000.5e1_0,
  1e3, 1E3,1e+3, 1e-3, 1.5e10, 1e05,
  1e1_0, 123.456e789, 1.4_5_6, .456,
  123., 0., 1.0, 1.012, 1.456,
  1_2_3.5, 12_3.4_56,
  1_2_3.4_5_6,  1_2_3.4_5_6e123,
];

const dec = [
  1.5, .5, 5., 0.0, 1.5e10,
  1e3, 1E3, 1e+3, 1e-3, 1.5E-10,
];

const s = [
  1n.toString(),
  1..toString(),
  1 .toString(),
  (1).toString(),
  1.5.toString(),
];

const obj = { 1n: 'a', 0xFFn: 'b', 0o2n: 1n };
const x = obj[1n];
switch (obj[0o2n]) { case 1n: break; }
const neg = -0n === 0n;
typeof 1n;
