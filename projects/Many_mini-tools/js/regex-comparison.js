var isMatch = function (s, p) {
	let up = new Array(p.length).fill(null)
	let down = new Array(s.length).fill(null)
	up[0] = true

  for (let i = 1; i <= p.length; i++) {
    if (p[i - 1] === "*") {
      up[i] = up[i - 2]
    } else {
      up[i] = false
    }
  }
  down[0] = false

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= p.length; j++) {
      if (p[j - 1] === "*") {
        if (down[j - 2] === true) {
          down[j] = true
        } else if (
          (p[j - 2] === s[i - 1] || p[j - 2] === ".") &&
          up[j] === true
        ) {
          down[j] = true
        } else {
          down[j] = false
        }
      } else if (p[j - 1] === s[i - 1] || p[j - 1] === ".") {
        down[j] = up[j - 1]
      } else {
        down[j] = false
      }
    }
    up = down
    down = []
    down[0] = false
  }

  return up[up.length - 1]
}

document.getElementById("regex-comparison-submit").onclick = function() {
    var string = document.getElementById("regex-comparison-string").value;
    var pattern = document.getElementById("regex-comparison-pattern").value;
    document.getElementById("regex-comparison-result").innerHTML = `${isMatch(string, pattern)}`;
}
