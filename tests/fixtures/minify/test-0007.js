// test for automatic semicolon insertion (ASI) after an object-literal `}`

module.exports = function() {
  const a = { x: 1, y: 2 }
  let b = a.x + a.y
  const c = {}
  c.z = b
  const d = { n: c.z, o: { p: 4 } }
  let e = d.n + d.o.p

  const g = {
    v: e
  }
  let h = g.v
  return b === 3 && c.z === 3 && e === 7 && h === 7
}
