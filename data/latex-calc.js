var fs = require('fs')
var minimist = require('minimist')

var lineReader = require('readline').createInterface({
  input: fs.createReadStream('./data-for-calc')
})

var total = 0
var counter = 0
var numbers = []

lineReader.on('line', function (line) {
  var number = parseInt(line)
  numbers.push(number - 331)
  total += number - 331
  counter = counter + 1
})

lineReader.on('close', function () {
  var mean = calculateMean(total, numbers.length)
  var variance = calculateVariance(numbers, mean)
  var standardDeviation = calculateStandardDeviation(variance)
  var median = calculateMedian(numbers)

  console.log('Mean: ', mean)
  console.log('Variance: ', variance)
  console.log('Standard deviation: ', standardDeviation)
  console.log('Median: ', median)
})

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function calculateMedian (values) {
  values.sort( function(a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2)
      return values[half];
  else
      return (values[half-1] + values[half]) / 2.0;
}

function calculateMean (total, number) {
  return (total / number)
}

function calculateVariance (inputs, mean) {
  const number = inputs.length
  let total = 0
  for (const input of inputs) {
    total += Math.pow((input - mean), 2)
  }
  return (total / number)
}

function calculateStandardDeviation (variance) {
  return Math.sqrt(variance)
}
