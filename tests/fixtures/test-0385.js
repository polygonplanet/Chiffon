const d = 8, g = 4, i = 2, m = 16, s = 3, u = 6, v = 9, y = 5;
let p = 10, q = 12;

const a = d/g/i, b = m/s/u, c = v/y/d/g;
const e = (d)/g/i, f = [m][0]/s/u, h = i.valueOf()/g/i;

// Tests for `++` / `--` followed by a `/` division operators
const j = --p/s/u, k = ++q/y/d, l = p++/g/i, x = q--/s/u;

let n1 = 1, n2 = 9;
// `+++` / `---` should be split into `++ +` / `-- -`
// `n1+++/g/` is parsed as `n1 ++ + /g/` (regex, not division)
const o1 = n1+++/g/.source, o2 = n2---/s/.source;

const re1 = /=/g;
const re2 = /a\/b\/c/gimsu;
const re3 = i > 0 ? /^\d+$/ : /x/y;
const re4 = [/g/, /i/m, /s/u];
const re5 = { p: /v/, q: d/g/i };
const w = typeof /re/ === 'object' ? d/g : g/d;

function fn1(n) {
  if (n) return /a/.test(String(n)) ? n/g/i : -n/y/d;
  switch (n) {
    case 0: return /b/.source.length/g/i;
  }
  return n/y/d;
}

const res = fn1(0) + fn1(1) + fn1(-1);
const fn2 = (n) => n > 0 ? n/g/i : /c/.test(String(n));

// Tests for Template literals and regex
const t1 = `n=${/\d+/.source}`, t2 = `${q}`.length/g/i;
const t3 = void /gi/.source, t4 = p instanceof RegExp ? p.flags : /m/g.source;

{ /* BlockStatement and regex */ }
/start/.test('line start');
