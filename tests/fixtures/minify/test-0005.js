// test for automatic semicolon insertion (ASI) after `)` `]` and `++` / `--`

module.exports = function() {
  const f = (a, b) => a + b
  const arr = [1, 2, 3]
  let t = 0
  let i = 0
  while (i < arr.length) {
    t = f(t, arr[i])
    i++
  }
  let a = f(t, t)
  let b = arr[0]
  a++
  b--
  let c = arr[2]
  let d = f(a, b)
  c--
  d++
  return t === 6 && a === 13 && b === 0 && c === 2 && d === 14
}
