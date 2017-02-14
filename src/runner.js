/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import { spawn, exec } from 'child_process'
import async from 'async'
import uuid from 'uuid'
import colors from 'colors'
import path from 'path'
import minimist from 'minimist'
import ms from 'ms'

// node dist/runner.js --num-containers 2 --num-peers 10 --signaling-url ws://192.168.1.144:8080/socketserver

/*
-----------------------------------------------------------------------------------
|
| Bootstrap test
|
-----------------------------------------------------------------------------------
*/

const args = minimist(process.argv.slice(2))

const NUM_CONTAINERS = args['num-containers'] || 10
const NUM_PEERS = args['num-peers'] || 20
const SIGNALING_URL = args['signaling-url'] || 'ws://178.62.51.86:8080/socketserver'
const TIMEOUT = args['timeout'] || ms('5m')
const MODE = args['mode'] || 'full' // mode can be either 'full', 'spawn' or 'walker'
const DOCKER_IMAGE_ID = `webrtc/${uuid.v1()}`
const spawns = []

if (MODE === 'full') {
  async.series([
    createDockerImage,
    createBootPeer,
    (cb) => { sleep(5000, cb) },
    (cb) => { runContainer(0, 'peer', cb) },
    (cb) => { sleep(5000, cb) },
    startWalker
  ], clean)
}

if (MODE === 'spawn') {
  async.series([
    createDockerImage,
    (cb) => { sleep(5000, cb) },
    (cb) => { runContainer(0, 'peer', cb) },
    (cb) => { sleep(TIMEOUT, cb) }
  ], clean)
}

if (MODE === 'walker') {
  async.series([
    createDockerImage,
    (cb) => { sleep(5000, cb) },
    startWalker
  ], clean)
}


/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function createDockerImage (cb) {
  const child = spawn('docker', ['build', '-t', DOCKER_IMAGE_ID, '.'])
  spawns.push(child)
  child.on('exit', cb)
}

function createBootPeer (cb) {
  const UUID = uuid.v1()
  const child = spawn('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'peer', SIGNALING_URL, 1, UUID])
  spawns.push(child)
  setTimeout(cb, 5000)
}

function runContainer (currentNum, type, cb) {
  // Terminate if sufficient containers have been spawned
  if (currentNum === NUM_CONTAINERS) return cb()
  console.log(`Launching container ${currentNum + 1}...`)

  // Generate UUID for Docker container instance
  const UUID = uuid.v1()

  // Spawn child process
  const child = spawn('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', type, SIGNALING_URL, NUM_PEERS, UUID])
  spawns.push(child)
  child.stdout.on('data', function (data) {
    console.log(data.toString())
    if (data.toString().indexOf('**NEXT**') !== -1) {
      runContainer(++currentNum, type, cb)
    }
  })
}

function startWalker (cb) {
  const child = spawn('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'walker', SIGNALING_URL])
  spawns.push(child)
  let numConnections = 0
  let timeTotal = 0
  let timeMin = 0
  let timeMax = 0
  let prevTime
  let duration
  child.stdout.on('data', function (data) {
    console.log(data.toString())
    if (data.toString().indexOf('Connection established to') !== -1) {
      let output = data.toString()
      let lines = output.split('file')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('Connection established to') === -1) {
          lines.splice(i, 1)
        }
      }
      lines.forEach(line => {

        line = line.split(' - ')
        let timestamp = parseInt(line[0].substring(line[0].lastIndexOf('"') + 1, line[0].length))

        if (prevTime) {
          duration = timestamp - prevTime

          if (timeMin === 0) timeMin = duration
          if (timeMax === 0) timeMax = duration

          if (duration < timeMin) timeMin = duration
          if (duration > timeMax) timeMax = duration

          timeTotal += duration

          numConnections++

          console.log(`Connection number: ${numConnections}`)
          console.log(`Duration: ${duration}`)
        }

        prevTime = timestamp
      })
    }
  })

  setTimeout(() => {
    console.log('')
    console.log('-------- ⚡️  Test completed ⚡️ --------')
    console.log('')
    console.log(`Number of connection handovers: ${colors.yellow.bold(numConnections)}`)
    console.log(`Fastest connection setup time:  ${colors.yellow.bold(timeMin.toFixed(2) + ' ms')}`)
    console.log(`Slowest connection setup time:  ${colors.yellow.bold(timeMax.toFixed(2) + ' ms')}`)
    console.log(`Avg. connection setup time:     ${colors.green.bold.underline(((timeTotal / (numConnections)).toFixed(2)) + ' ms')}`)
    console.log('')

    child.kill()
    cb()
  }, TIMEOUT)
}

function clean () {
  exec(`${path.join(__dirname, '..', 'clean.sh')} ${DOCKER_IMAGE_ID}`, (err, stdout, stderr) => {
    console.log('Cleanup completed')
  })
}


/*
-----------------------------------------------------------------------------------
|
| Utils
|
-----------------------------------------------------------------------------------
*/

function sleep (millis, cb) {
  setTimeout(cb, millis)
}
