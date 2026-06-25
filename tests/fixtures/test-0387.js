let a = null, b = 0, c = '';
const r1 = (a &&= 1) && 2;
const r2 = (a ||= 5) + (b ??= 7);

let x = 1;
const arr = [x ||= 2, x &&= 3, x ??= 4];

const obj = { p: 0 };
obj.p ||= obj.p < 5 ? 10 : 20;

let m, n;
const chain = m ||= n ??= 'z';

const dynKey = ({ y: 1 })[c ||= 'y'];

const seq = (a &&= a + 1, b ??= b);

const eq = (b &&= b === 0);

const re = a ||= /^x/.test('x');
