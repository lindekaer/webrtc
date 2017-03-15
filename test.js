// var argv = require('minimist')(process.argv.slice(2))
// console.dir(argv)

// var exec = require('ssh-exec')
// var ip = '162.243.150.174'

var exec = require('child_process').exec

var command = `
echo "hey";
echo "yo";
echo "---";
ls
`

exec(command, (err, stdout, stderr) => {
  console.log(err)
  console.log(stdout)
  console.log(stderr)
})



// exec('ssh-keyscan 162.243.150.174', (err, stdout, stderr) => {
//   // console.log(err)
//   var arr = stdout.split('\n')

//   for (let line of arr) {
//     if (line.indexOf(`${'162.243.150.174'} ecdsa-sha2-nistp256 `) !== -1) {
//       console.log(line)
//     }
//   }

//   // console.log(stderr)
// })
