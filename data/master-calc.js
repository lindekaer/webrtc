var fs = require('fs')
var minimist = require('minimist')
var async = require('async')
var path = require('path')
var args = minimist(process.argv.slice(2))

var numbers = {
  1: true,
  2: true,
  4: true,
  8: true,
  16: true,
  32: true
}

async.series([
  cb => getAvg(1, cb),
  cb => getAvg(2, cb),
  cb => getAvg(4, cb),
  cb => getAvg(8, cb),
  cb => getAvg(16, cb),
  cb => getAvg(32, cb)
], () => {
  console.log('Done!')
  console.log('Numbers:')
  console.log(numbers)
})

function getAvg (number, cb) {
  var total = 0
  var counter = 0

  var lineReader = require('readline').createInterface({
    input: fs.createReadStream(args['input-file'])
  })

  lineReader.on('line', function (line) {
    var number = parseInt(line)
    total += number
    counter = counter + 1
  })

  lineReader.on('close', function () {
    numbers[number] = total / counter
  })
}
