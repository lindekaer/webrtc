
var str = `
file:///app/walker.html 2723:10 "1490003879597 - ##LOG## Connection established to node 5"
file:///app/walker.html 2843:18 "Closing connection"
file:///app/walker.html 2805:16 "On message"
file:///app/walker.html 2723:10 "1490003879111 - ##LOG## Connection established to node 6"
file:///app/walker.html 2803:14 "On data channel"
file:///app/walker.html 2834:16 "On open"

`

var timestamps = []
var output = str.split('\n')
for (let i = 0; i < output.length; i++) {
  if (output[i].indexOf('##LOG##') !== -1) {
    timestamps.push(output[i])
  }
}

console.log(timestamps)
