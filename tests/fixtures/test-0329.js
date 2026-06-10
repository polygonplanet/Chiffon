var a;
switch (a) {
  case 1: break;
  default: break;
}

try {
  throw null;
} catch (e) {
  if (e instanceof Error) {
    void 0;
  }
} finally {
  void 0;
}

for (var i = 0; i < 5; i++) {
  if (i === 1) {
    continue;
  } else {
    void 0;
  }
}

do {
  void 0;
} while (i--);

for (var k in o) {
  break;
}

var F = function(){
  return this;
};
var f = new F();

var o = { a: 1 };
with (o) {
  void 0;
}
delete o.a;
