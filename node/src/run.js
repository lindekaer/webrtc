/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import { spawn } from 'child_process'
import async from 'async'
import path from 'path'

/*
-----------------------------------------------------------------------------------
|
| Bootstrap test
|
-----------------------------------------------------------------------------------
*/

const NUM_PEER = parseInt(process.argv[2]) || 10
const PATH_WALKER = path.join(__dirname, 'walker.js')
const PATH_PEER = path.join(__dirname, 'peer.js')
const PATH_SERVER = path.join(__dirname, 'server.js')
const children = []

async.series([
  (cb) => { startServer(cb) },
  (cb) => { sleep(5000, cb) },
  (cb) => { spawnPeers(0, NUM_PEER, cb) },
  (cb) => { sleep(1000, cb) },
  (cb) => { spawnWalker(cb) },
  (cb) => { cleanup(cb) }
], (err, data) => {
  if (err) console.log(err)
  console.log(`${NUM_PEER} has been spawned.`)
})

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function startServer (cb) {
  const server = spawn('node', [PATH_SERVER])
  children.push(server)
  server.stdout.on('data', function (data) { process.stdout.write(data.toString()) })
  server.stderr.on('data', function (data) { process.stdout.write(data.toString()) })
  cb()
}

function sleep (millis, cb) {
  setTimeout(cb, millis)
}

function spawnPeers (currentNum, goalNum, cb) {
  if (currentNum === goalNum) return cb()
  const peer = spawn('node', [PATH_PEER])
  children.push(peer)
  peer.stdout.on('data', function (data) { process.stdout.write(data.toString()) })
  peer.stderr.on('data', function (data) { process.stdout.write(data.toString()) })
  setTimeout(() => {
    spawnPeers(++currentNum, goalNum, cb)
  }, 3000)
}

function spawnWalker () {
  const walker = spawn('node', [PATH_WALKER])
  walker.stdout.on('data', function (data) { process.stdout.write(data.toString()) })
  walker.stderr.on('data', function (data) { process.stdout.write(data.toString()) })
  children.push(walker)
}

function cleanup (cb) {
  for (const child of children) {
    child.kill('SIGHUP')
  }
  cb()
}
