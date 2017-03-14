'use strict';

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
-----------------------------------------------------------------------------------
|
| CLI configuration
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

const argv = (0, _minimist2.default)(process.argv.slice(2));
const URL_CREATE_DROPLET = 'https://api.digitalocean.com/v2/droplets';
const DIGITAL_OCEAN_TOKEN = argv.t || argv.token || 'c727c768c699938c9e88c8e8a0a84d43a22d792f04e663fdcedff7df7b913021';
const COMMAND = argv.c || argv.command || 'help';

const controller = {
  help: displayHelp(),
  'create-droplet': createDroplet()
};

controller[COMMAND];

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function displayHelp() {
  console.log('HELP!!!!');
}

function createDroplet() {
  const options = {
    method: 'POST',
    url: URL_CREATE_DROPLET,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`
    }
  };

  (0, _request2.default)(options, (err, res, body) => {
    if (err) throw err;
    if (res.statusCode !== 200) console.log('An error occured!');
  });
}