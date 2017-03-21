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
import fs from 'fs'

/*
-----------------------------------------------------------------------------------
|
| Bootstrap test
|
-----------------------------------------------------------------------------------
*/

const args = minimist(process.argv.slice(2))
const DOCKER_NAME = uuid.v1()

const NUM_CONTAINERS = args['num-containers'] || 10
const NUM_PEERS = args['num-peers'] || 20
const SIGNALING_URL = args['signaling-url'] || 'ws://178.62.51.86:8080/socketserver'
const TIMEOUT = args['timeout'] || ms('10000m')
const MODE = args['mode'] || 'full' // mode can be either 'full', 'spawn' or 'walker'
const DOCKER_IMAGE_ID = `webrtc/${DOCKER_NAME}`
const ID = args['id']
const FIRST_PEER = args['first-peer']
const DELAY = args['delay']

let OUTPUT_FILE
let OUTPUT_FILE_PATH

if (MODE === 'walker') {
  OUTPUT_FILE = args['output-file']
  OUTPUT_FILE_PATH = path.join(__dirname, '..', 'data', OUTPUT_FILE)
}

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
    FIRST_PEER ? createBootPeer : noop,
    (cb) => { sleep(5000, cb) },
    (cb) => { runContainer(0, 'peer', cb) },
    (cb) => { sleep(TIMEOUT, cb) }
  ], clean)
}

if (MODE === 'walker') {
  async.series([
    DELAY ? delay : noop,
    createDockerImage,
    (cb) => { sleep(1000, cb) },
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
  child.on('exit', cb)
}

function createBootPeer (cb) {
  console.log('Launching a boot peer...')
  const UUID = uuid.v1()
  spawn('docker', ['run', '-P', '--net=host', '--rm', DOCKER_IMAGE_ID, 'test', 'peer', SIGNALING_URL, 1, UUID])
  setTimeout(cb, 5000)
}

function runContainer (currentNum, type, cb) {
  // Terminate if sufficient containers have been spawned
  if (currentNum === NUM_CONTAINERS) return cb()
  console.log(`Launching container ${currentNum + 1}...`)

  // Generate UUID for Docker container instance
  const UUID = uuid.v1()

  // Spawn child process
  const child = spawn('docker', ['run', '-P', '--net=host', '--name', DOCKER_NAME, '--rm', DOCKER_IMAGE_ID, 'test', type, SIGNALING_URL, NUM_PEERS, UUID])
  child.stdout.on('data', function (data) {
    console.log(data.toString())
    if (data.toString().indexOf('**NEXT**') !== -1) {
      runContainer(++currentNum, type, cb)
    }
  })
}

function startWalker (cb) {
  const child = spawn('docker', ['run', '-P', '--net=host', '--name', DOCKER_NAME, '--rm', DOCKER_IMAGE_ID, 'test', 'walker', SIGNALING_URL])
  let numConnections = 0
  let dataLines = []
  let durations = []
  let timeTotal = 0
  let timeMin = 0
  let timeMax = 0
  let prevTime
  let duration
  child.stdout.on('data', function (data) {
    console.log(data.toString())
    const researchData = []
    const output = data.toString()
    const lines = output.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('### LOG ###') !== -1) {
        researchData.push(lines[i])
      }
    }

    researchData.forEach(line => {
      var arr = line.split('### LOG ###')
      var times = arr[1].split(',')

      let timestamp = times[0]
      let timeSpentGatheringHost = times[1]
      let timeSpentGatheringAll = times[2]
      let timeSpentSetupPeerConnection = times[3].substring(0, times[3].length - 1)

      if (prevTime) {
        duration = timestamp - prevTime

        if (timeMin === 0) timeMin = duration
        if (timeMax === 0) timeMax = duration

        if (duration < timeMin) timeMin = duration
        if (duration > timeMax) timeMax = duration

        durations.push(duration)

        dataLines.push(`${duration}, ${timeSpentGatheringHost}, ${timeSpentGatheringAll}, ${timeSpentSetupPeerConnection}`)

        timeTotal += duration

        numConnections++

        console.log(`Connection number: ${numConnections}`)
        console.log(`Duration: ${duration}`)
        console.log(`Host gathering: ${timeSpentGatheringHost}`)
        console.log(`ICE gathering: ${timeSpentGatheringAll}`)
        console.log(`Peer connection: ${timeSpentSetupPeerConnection}`)
        console.log('------------------------------------')
        console.log('')
      }

      prevTime = timestamp

      if (durations.length === NUM_PEERS * NUM_CONTAINERS) {
        const mean = calculateMean(timeTotal, numConnections)
        const variance = calculateVariance(durations, mean)
        const standardDeviation = calculateStandardDeviation(variance)

        console.log('')
        console.log('-------- ⚡️  Test completed ⚡️ --------')
        console.log('')
        console.log(`Number of connection handovers: ${colors.yellow.bold(numConnections)}`)
        console.log(`Min (fastest handover):         ${colors.yellow.bold(timeMin.toFixed(2) + ' ms')}`)
        console.log(`Max (slowest handover):         ${colors.yellow.bold(timeMax.toFixed(2) + ' ms')}`)
        console.log(`Mean:                           ${colors.green.bold.underline(`${mean.toFixed(2)}`)}`)
        console.log(`Variance:                       ${colors.green.bold.underline(`${variance.toFixed(2)}`)}`)
        console.log(`Standard deviation:             ${colors.green.bold.underline(`${standardDeviation.toFixed(2)}`)}`)
        console.log('')
        console.log(`Writing test results...`)
        let fileContent = ''
        for (let d of dataLines) fileContent += `${d}\n`
        fs.appendFile(OUTPUT_FILE_PATH, fileContent, { encoding: 'utf-8' }, () => {
          console.log(`Appended results to ${colors.green.bold(OUTPUT_FILE_PATH)}!`)
          console.log('')
          child.kill()
          return cb()
        })
      }
    })
  })
}

function clean () {
  exec(`${path.join(__dirname, '..', 'clean.sh')} ${DOCKER_NAME}`, (err, stdout, stderr) => {
    console.log('Cleanup completed')
    process.exit()
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

function noop (cb) {
  cb()
}

function delay (cb) {
  setTimeout(cb, DELAY)
}
