/*
comment
*/

// Lorem ipsum dolor sit `amet, consectetur adipisicing` elit. Voluptates
// perspiciatis quidem impedit deleniti expedita debitis id temporibus
/*laudantium sint maxime,// /*
architecto perferendis natus "tempora iure alias totam "
consequuntur ab commodi.*/

module.exports = function() {
  var string = 'string';
  var string2 = "str\"i'ng";
  var multilineString = "aaa\"bbb'\
ccc"; // "
  // "
  if (string.charAt(0) === string2.charAt(0)) {
    string += string.replace(/^(.).*$/g, '$1') +
      multilineString.replace(/[^\w]+/g, "");
  }

  if (string !== 'stringsaaabbbccc') {
    return false;
  }

  // 'comment'

  var array = [
    0, 42, 12345, -1, -1.1, -0.1, 864e5, .5, 1., 1.e2, 1.e+1,
    -1.4142135623730951, 3.141592653589793,
    0.0314e-1, 0.0314E+2, .0314e-1, .0314E+2,
    0x0FFF, 0X7fF
  ];

  var n = 0;
  for (var i = 0; i < array.length; i++) {
    n += array[i];
  }

  if (n !== 86418646.31365909) {
    return false;
  }

  // /*
  var もじ = '/*"もじ"*/'; // */
  var a = 1 + 2 - 3 * 4 / 5 % 6 | 7 & 8 ^ 9 << 2 >> 3 >>> 1 || 3 && 5;

  if (a !== 2 || !/もじ/.test(もじ)) {
    return false;
  }

  var g = 2;
  var x = (a++ +i)/1/g;

  return x === 10.5;
};
