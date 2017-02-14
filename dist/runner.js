'use strict';

var _child_process = require('child_process');

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// node dist/runner.js --num-containers 2 --num-peers 10 --signaling-url ws://192.168.1.144:8080/socketserver

/*
-----------------------------------------------------------------------------------
|
| Bootstrap test
|
-----------------------------------------------------------------------------------
*/

/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

const args = (0, _minimist2.default)(process.argv.slice(2));

const NUM_CONTAINERS = args['num-containers'] || 10;
const NUM_PEERS = args['num-peers'] || 20;
const SIGNALING_URL = args['signaling-url'] || 'ws://178.62.51.86:8080/socketserver';
const TIMEOUT = args['timeout'] || 40000;
const DOCKER_IMAGE_ID = `webrtc/${ _uuid2.default.v1() }`;
const spawns = [];

_async2.default.series([createDockerImage, createBootPeer, cb => {
  sleep(5000, cb);
}, cb => {
  runContainer(0, 'peer', cb);
}, cb => {
  sleep(5000, cb);
}, startWalker], clean);

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function createDockerImage(cb) {
  const child = (0, _child_process.spawn)('docker', ['build', '-t', DOCKER_IMAGE_ID, '.']);
  spawns.push(child);
  child.on('exit', cb);
}

function createBootPeer(cb) {
  const UUID = _uuid2.default.v1();
  const child = (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'peer', SIGNALING_URL, 1, UUID]);
  spawns.push(child);
  setTimeout(cb, 5000);
}

function runContainer(currentNum, type, cb) {
  // Terminate if sufficient containers have been spawned
  if (currentNum === NUM_CONTAINERS) return cb();
  console.log(`Launching container ${ currentNum + 1 }...`);

  // Generate UUID for Docker container instance
  const UUID = _uuid2.default.v1();

  // Spawn child process
  const child = (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', type, SIGNALING_URL, NUM_PEERS, UUID]);
  spawns.push(child);
  child.stdout.on('data', function (data) {
    console.log(data.toString());
    if (data.toString().indexOf('**NEXT**') !== -1) {
      runContainer(++currentNum, type, cb);
    }
  });
}

function startWalker(cb) {
  console.log('Here!');
  const child = (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'walker', SIGNALING_URL]);
  spawns.push(child);
  let numConnections = 0;
  let timeTotal = 0;
  let timeMin = 0;
  let timeMax = 0;
  let prevTime;
  let duration;
  child.stdout.on('data', function (data) {
    console.log(data.toString());
    if (data.toString().indexOf('Connection established to') !== -1) {
      let output = data.toString();
      let lines = output.split('file');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('Connection established to') === -1) {
          lines.splice(i, 1);
        }
      }
      lines.forEach(line => {
        line = line.split(' - ');
        let timestamp = line[0].substring(line[0].lastIndexOf('"') + 1, line[0].length);
        timestamp = parseInt(timestamp);

        if (prevTime) {

          duration = timestamp - prevTime;

          if (timeMin === 0) timeMin = duration;
          if (timeMax === 0) timeMax = duration;

          if (duration < timeMin) timeMin = duration;
          if (duration > timeMax) timeMax = duration;

          timeTotal += duration;

          numConnections++;

          console.log(`Connection number: ${ numConnections }`);
          console.log(`Duration: ${ duration }`);
        }

        prevTime = timestamp;
      });
    }
  });

  setTimeout(() => {
    console.log('');
    console.log('-------- ⚡️  Test completed ⚡️ --------');
    console.log('');
    console.log(`Number of containers:           ${ _colors2.default.yellow.bold(NUM_CONTAINERS) } (${ NUM_PEERS } peers each)`);
    console.log(`Number of peers:                ${ _colors2.default.yellow.bold(NUM_CONTAINERS * NUM_PEERS) }`);
    console.log(`Fastest connection setup time:  ${ _colors2.default.yellow.bold(timeMin.toFixed(2) + ' ms') }`);
    console.log(`Slowest connection setup time:  ${ _colors2.default.yellow.bold(timeMax.toFixed(2) + ' ms') }`);
    console.log(`Avg. connection setup time:     ${ _colors2.default.green.bold.underline((timeTotal / (NUM_CONTAINERS * NUM_PEERS)).toFixed(2) + ' ms') }`);
    console.log('');

    child.kill();
    cb();
  }, TIMEOUT);
}

function clean() {
  (0, _child_process.exec)(`${ _path2.default.join(__dirname, '..', 'clean.sh') } ${ DOCKER_IMAGE_ID }`, (err, stdout, stderr) => {
    console.log('Cleanup completed');
  });
}

/*
-----------------------------------------------------------------------------------
|
| Utils
|
-----------------------------------------------------------------------------------
*/

function sleep(millis, cb) {
  setTimeout(cb, millis);
}