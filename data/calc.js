var fs = require('fs')
var minimist = require('minimist')
var args = minimist(process.argv.slice(2))

var lineReader = require('readline').createInterface({
  input: fs.createReadStream(args['input-file'])
})

var total = 0
var counter = 0

lineReader.on('line', function (line) {
  var number = parseInt(line)
  total += number
  counter = counter + 1
})

lineReader.on('close', function () {
  console.log('Avg: ' + (total / counter))
})

