a:
for (var i = 0; i < 10; i++) {
  for (var j = 0; j < 10; j++) {
    if (j === 1) {
      continue a;
    }
    if (j === 5) {
      break a;
    }
  }
}