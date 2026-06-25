const obj = { s: '', n: 0, a: null };
obj.s ||= 'default value';
obj.n &&= obj.n * 2;
obj.a ??= [];

let c = 0;
c ||= 3;

const obj2 = {};
obj2.key ??= 'abc';
