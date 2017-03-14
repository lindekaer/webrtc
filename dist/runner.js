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

var _ms = require('ms');

var _ms2 = _interopRequireDefault(_ms);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
-----------------------------------------------------------------------------------
|
| Bootstrap test
|
-----------------------------------------------------------------------------------
*/

const args = (0, _minimist2.default)(process.argv.slice(2)); /*
                                                             -----------------------------------------------------------------------------------
                                                             |
                                                             | Imports
                                                             |
                                                             -----------------------------------------------------------------------------------
                                                             */

const NUM_CONTAINERS = args['num-containers'] || 10;
const NUM_PEERS = args['num-peers'] || 20;
const SIGNALING_URL = args['signaling-url'] || 'ws://178.62.51.86:8080/socketserver';
const TIMEOUT = args['timeout'] || (0, _ms2.default)('5m');
const MODE = args['mode'] || 'full'; // mode can be either 'full', 'spawn' or 'walker'
const DOCKER_IMAGE_ID = `webrtc/${_uuid2.default.v1()}`;

if (MODE === 'full') {
  _async2.default.series([createDockerImage, createBootPeer, cb => {
    sleep(5000, cb);
  }, cb => {
    runContainer(0, 'peer', cb);
  }, cb => {
    sleep(5000, cb);
  }, startWalker], clean);
}

if (MODE === 'spawn') {
  _async2.default.series([createDockerImage, cb => {
    sleep(5000, cb);
  }, cb => {
    runContainer(0, 'peer', cb);
  }, cb => {
    sleep(TIMEOUT, cb);
  }], clean);
}

if (MODE === 'walker') {
  _async2.default.series([createDockerImage, cb => {
    sleep(5000, cb);
  }, startWalker], clean);
}

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function createDockerImage(cb) {
  const child = (0, _child_process.spawn)('docker', ['build', '-t', DOCKER_IMAGE_ID, '.']);
  child.on('exit', cb);
}

function createBootPeer(cb) {
  const UUID = _uuid2.default.v1();
  (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'peer', SIGNALING_URL, 1, UUID]);
  setTimeout(cb, 5000);
}

function runContainer(currentNum, type, cb) {
  // Terminate if sufficient containers have been spawned
  if (currentNum === NUM_CONTAINERS) return cb();
  console.log(`Launching container ${currentNum + 1}...`);

  // Generate UUID for Docker container instance
  const UUID = _uuid2.default.v1();

  // Spawn child process
  const child = (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', type, SIGNALING_URL, NUM_PEERS, UUID]);
  child.stdout.on('data', function (data) {
    console.log(data.toString());
    if (data.toString().indexOf('**NEXT**') !== -1) {
      runContainer(++currentNum, type, cb);
    }
  });
}

function startWalker(cb) {
  const child = (0, _child_process.spawn)('docker', ['run', '--rm', DOCKER_IMAGE_ID, 'test', 'walker', SIGNALING_URL]);
  let numConnections = 0;
  let durations = [];
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
        let timestamp = parseInt(line[0].substring(line[0].lastIndexOf('"') + 1, line[0].length));

        if (prevTime) {
          duration = timestamp - prevTime;

          if (timeMin === 0) timeMin = duration;
          if (timeMax === 0) timeMax = duration;

          if (duration < timeMin) timeMin = duration;
          if (duration > timeMax) timeMax = duration;

          durations.push(duration);

          timeTotal += duration;

          numConnections++;

          console.log(`Connection number: ${numConnections}`);
          console.log(`Duration: ${duration}`);
        }

        prevTime = timestamp;

        if (durations.length === NUM_PEERS * NUM_CONTAINERS) {
          const mean = calculateMean(timeTotal, numConnections);
          const variance = calculateVariance(durations, mean);
          const standardDeviation = calculateStandardDeviation(variance);

          console.log('');
          console.log('-------- ⚡️  Test completed ⚡️ --------');
          console.log('');
          console.log(`Number of connection handovers: ${_colors2.default.yellow.bold(numConnections)}`);
          console.log(`Min (fastest handover):         ${_colors2.default.yellow.bold(timeMin.toFixed(2) + ' ms')}`);
          console.log(`Max (slowest handover):         ${_colors2.default.yellow.bold(timeMax.toFixed(2) + ' ms')}`);
          console.log(`Mean:                           ${_colors2.default.green.bold.underline(`${mean.toFixed(2)}`)}`);
          console.log(`Variance:                       ${_colors2.default.green.bold.underline(`${variance.toFixed(2)}`)}`);
          console.log(`Standard deviation:             ${_colors2.default.green.bold.underline(`${standardDeviation.toFixed(2)}`)}`);
          console.log('');

          child.kill();
          cb();
        }
      });
    }
  });
}

function clean() {
  (0, _child_process.exec)(`${_path2.default.join(__dirname, '..', 'clean.sh')} ${DOCKER_IMAGE_ID}`, (err, stdout, stderr) => {
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

function calculateMean(total, number) {
  return total / number;
}

function calculateVariance(inputs, mean) {
  const number = inputs.length;
  let total = 0;
  for (const input of inputs) {
    total += Math.pow(input - mean, 2);
  }
  return total / number;
}

function calculateStandardDeviation(variance) {
  return Math.sqrt(variance);
}