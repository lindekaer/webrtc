/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import minimist from 'minimist'
import request from 'request'

/*
-----------------------------------------------------------------------------------
|
| CLI configuration
|
-----------------------------------------------------------------------------------
*/

const argv = minimist((process.argv.slice(2)))
const URL_CREATE_DROPLET = 'https://api.digitalocean.com/v2/droplets'
const DIGITAL_OCEAN_TOKEN = argv.t || argv.token || 'c727c768c699938c9e88c8e8a0a84d43a22d792f04e663fdcedff7df7b913021'
const COMMAND = argv.c || argv.command || 'help'

const controller = {
  help: displayHelp(),
  'create-droplet': createDroplet()
}

controller[COMMAND]


/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function displayHelp () {
  console.log('HELP!!!!')
}

function createDroplet () {
  const options = {
    method: 'POST',
    url: URL_CREATE_DROPLET,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`
    }
    body: {
      name:"example.com",
      region:"nyc3",
      size:"512mb",
      image:"ubuntu-14-04-x64",
      ssh_keys:null,
      backups:false,
      ipv6:true,
      user_data:null,
      private_networking:null,
      volumes: null,
      tags:["web"]
    }
  }

  request(options, (err, res, body) => {
    if (err) throw err
    if (res.statusCode !== 200) console.log('An error occured!')
  })
}