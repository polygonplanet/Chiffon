// test for semicolon

module.exports = function() {
  var a = 1
  var b = 2
  var c
  var d
  c = a + b
  d = c === 3
  return d
}
