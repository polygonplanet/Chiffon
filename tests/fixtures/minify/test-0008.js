// test for automatic semicolon insertion (ASI) after a function-expression `}`

module.exports = function() {
  const a = function(n) {
    return n * 2
  }
  let b = a(3)
  const c = function() {
    return 10
  }
  let d = c()
  const e = (n) => {
    return n + 1
  }
  let g = e(4)
  return b === 6 && d === 10 && g === 5
}
