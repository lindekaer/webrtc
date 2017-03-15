/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import minimist from 'minimist'
import request from 'request'
import colors from 'colors'
import async from 'async'
import exec from 'ssh-exec'
import { exec as localExec } from 'child_process'


/*
-----------------------------------------------------------------------------------
|
| CLI configuration
|
-----------------------------------------------------------------------------------
*/

const argv = minimist((process.argv.slice(2)))
const URL_DROPLET = 'https://api.digitalocean.com/v2/droplets'
const DIGITAL_OCEAN_TOKEN = argv.t || argv.token || 'c727c768c699938c9e88c8e8a0a84d43a22d792f04e663fdcedff7df7b913021'
const COMMAND = argv._[0] || 'help'
const DROPLET_NAME = argv.n || argv.name || 'Max-the-great'
const DROPLET_CITY = argv.c || argv.city || 'london'
const DROPLET_SIZE = argv.s || argv.size || '512mb'
const DROPLET_ID = argv.i || argv.id

const cities = {
  'new-york': 'nyc1',
  'san-francisco': 'sfo1',
  amsterdam: 'ams1',
  singapore: 'sgp1',
  london: 'lon1',
  frankfurt: 'fra1',
  toronto: 'tor1',
  bangalore: 'blr1'
}

const controller = {
  help: displayHelp,
  'create-droplet': createDropletSequence,
  'destroy-droplet': destroyDropletSequence
}

controller[COMMAND]()

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function displayHelp () {
  console.log('Help!')
}

async function createDropletSequence () {
  try {
    console.log('')
    console.log(colors.yellow.bold('Creating droplet...'))
    const id = await createDroplet()
    console.log(colors.yellow.bold('Waiting for setup...'))
    const ip = await getDropletIpWhenReady(id)
    console.log(`${colors.green('Digital Ocean ID:')} ${id}`)
    console.log(`${colors.green('IP:')} ${ip}`)
    console.log('')
    console.log(colors.yellow.bold('Provisioning droplet...'))
    await sleep(30000)
    await addIpToKnownHosts(ip)
    // await provisionDroplet(ip)
    console.log('')
  } catch (err) {
    console.log(err)
  }
}

async function destroyDropletSequence () {
  try {
    console.log('')
    console.log(colors.yellow.bold('Destroying droplet...'))
    await destroyDroplet()
    console.log(`${colors.green('Status:')} Destroyed`)
    console.log('')
  } catch (err) {
    console.log(err)
  }
}

function createDroplet () {
  return new Promise((resolve, reject) => {
    const city = cities[DROPLET_CITY]
    if (!city) throw new Error('Please specify a city')

    const options = {
      method: 'POST',
      json: true,
      url: URL_DROPLET,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`
      },
      body: {
        name: DROPLET_NAME,
        region: city,
        size: DROPLET_SIZE,
        image: 'ubuntu-14-04-x64',
        ssh_keys: [
          '1f:d8:46:0e:a4:fe:f7:0a:0a:31:b1:af:3d:2d:ba:c7',
          'f9:b9:83:7a:7b:3c:d2:69:97:d2:aa:5d:c5:da:8f:57'
        ],
        backups: false,
        ipv6: false,
        user_data: null,
        private_networking: null,
        volumes: null
      }
    }
    request(options, (err, res, body) => {
      if (err) reject(err)
      console.log(`${colors.green('Name:')} ${DROPLET_NAME}`)
      console.log(`${colors.green('City:')} ${DROPLET_CITY}`)
      console.log(`${colors.green('Size:')} 512mb`)
      console.log('')

      resolve(body.droplet.id)
    })
  })
}

function getDropletIpWhenReady (id) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      json: true,
      url: URL_DROPLET + '/' + id,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`
      }
    }
    let isReady = false
    let ip = ''

    async.whilst(
      () => { return !isReady },
      (cb) => {
        setTimeout(() => {
          request(options, (err, res, body) => {
            if (err) reject(err)
            const droplet = body.droplet
            isReady = droplet.status === 'active'
            ip = droplet.networks.v4[0].ip_address
            cb()
          })
        }, 5000)
      }, (err, n) => {
        if (err) reject(err)
        resolve(ip)
      })
  })
}

function destroyDroplet () {
  return new Promise((resolve, reject) => {
    if (!DROPLET_ID) throw new Error('Please specify a droplet ID')
    const options = {
      method: 'DELETE',
      url: URL_DROPLET + '/' + DROPLET_ID,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`
      }
    }
    request(options, (err, res, body) => {
      if (err) reject(err)
      resolve()
    })
  })
}

function addIpToKnownHosts (ip) {
  return new Promise((resolve, reject) => {
    localExec(`ssh-keyscan ${ip}`, (err, stdout, stderr) => {
      if (err) reject(err)
      var arr = stdout.split('\n')
      for (let line of arr) {
        if (line.indexOf(`${ip} ecdsa-sha2-nistp256 `) !== -1) {
          console.log('Retrieved RSA fingerprint for droplet')
          localExec(`echo "${line}" >> ~/.ssh/known_hosts`, (err, stdout, stderr) => {
            if (err) reject(err)
            console.log('Added RSA fingerprint to known hosts')
            resolve()
          })
        }
      }
    })
  })
}

function provisionDroplet (ip) {
  console.log('Running build script')
  const command = `
    apt-get install git -y;
    cd /;
    git clone https://lindekaer:lextalioniS10@github.com/lindekaer/webrtc.git;
    cd /webrtc;
    git checkout jit-docker;
    chmod 777 ./build.sh;
    ./build.sh;
  `
  return new Promise((resolve, reject) => {
    exec(command, `root@${ip}`, (err, stdout, stderr) => {
      console.log(err)
      console.log(stdout)
      console.log(stderr)
    })
  })
}

function sleep (millis) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millis)
  })
}
