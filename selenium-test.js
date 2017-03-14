/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var webdriver = require('selenium-webdriver')
var chrome = require('selenium-webdriver/chrome')

/*
-----------------------------------------------------------------------------------
|
| Selenium test
|
-----------------------------------------------------------------------------------
*/

// Get the command line args
var type = process.argv[2]
var numberOfPeers = parseInt(process.argv[3])

// Setup driver
var loggingPreferences = new webdriver.logging.Preferences()
loggingPreferences.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.ALL)

// Configure the Chrome Driver
var chromeOptions = new chrome.Options()
chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--enable-logging')
chromeOptions.setLoggingPrefs(loggingPreferences)

// Create a driver instance
var driver = new webdriver.Builder()
  .forBrowser(webdriver.Browser.CHROME)
  .setChromeOptions(chromeOptions)
  .build()

const path = `file:///app/${type}.html`

if (type === 'walker') {
  driver.get(path)
  driver.wait(doneSignalFired)
  driver.quit()
}

if (type === 'peer') {
  driver.get(path)
  for (let i = 1; i < numberOfPeers; i++) {
    driver.executeScript(`window.open('${path}');`)
  }
  setTimeout(() => {
    console.log('**NEXT**')
  }, 10000)
  driver.wait(doneSignalFired)
  driver.quit()
}

/*
-----------------------------------------------------------------------------------
|
| Functions
|
-----------------------------------------------------------------------------------
*/

function doneSignalFired () {
  return (function () {
    return new Promise((resolve, reject) => {
      const interval = setInterval(function () {
        driver.manage().logs().get(webdriver.logging.Type.BROWSER)
          .then(function (entries) {
            entries.forEach(e => {
              console.log(e.message)
              if (e.message.indexOf('**DONE**') !== -1) {
                clearInterval(interval)
                return resolve()
              }
            })
          })
      }, 1000)
    })
  })().then(() => true)
}

// driver.get(`file:///app/index.html`)
// let count = 0
// setTimeout(() => {
//   async.whilst(
//     () => {
//       return count < numberOfPeers
//     },
//     (cb) => {
//       count++
//       console.log('Peer spawning, number: ', count)
//       driver.executeScript(`window.open('${path}');`)
//       setTimeout(() => { cb(null, count) }, 1000)
//     },
//     () => {
//       setTimeout(() => {
//         console.log('**NEXT**')
//       }, 500)
//     }
//   )
// }, 2000)
