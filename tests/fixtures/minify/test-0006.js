// test for automatic semicolon insertion (ASI) before a leading `++` / `--`

module.exports = function() {
  const f = (x) => x
  const arr = [1, 2]
  let a = 1
  let b = 2
  let c = a
  ++b
  let d = f(b)
  --a
  let e = arr[0]
  ++e
  let g = b
  --g
  return a === 0 && b === 3 && c === 1 && d === 3 && e === 2 && g === 2
}
