/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var webdriver = require('selenium-webdriver')
var chrome = require('selenium-webdriver/chrome')
var async = require('async')

/*
-----------------------------------------------------------------------------------
|
| Test
|
-----------------------------------------------------------------------------------
*/

// Get the command line args
var type = process.argv[2]
var numberOfPeers = parseInt(process.argv[3])

// Setup driver
var loggingPreferences = new webdriver.logging.Preferences()
loggingPreferences.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.ALL)

var chromeOptions = new chrome.Options()
chromeOptions.addArguments('--no-sandbox')
chromeOptions.addArguments('--enable-logging')
chromeOptions.setLoggingPrefs(loggingPreferences)

var driver = new webdriver.Builder()
  .forBrowser(webdriver.Browser.CHROME)
  .setChromeOptions(chromeOptions)
  .build()

const path = `file:///app/${type}.html`

// type = 'peer'
// numberOfPeers = 5
// const path = type === 'peer' ? `file:///Users/theo/Sites/webrtc/peer-inlined.local.html` : `file:///Users/theo/Sites/webrtc/walker-inlined.local.html`

if (type === 'walker') {
  driver.get(path)
  driver.wait(doneSignalFired)
  driver.quit()
} else {
  driver.get(path)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  driver.executeScript(`window.open('${path}');`)
  setTimeout(() => {
    console.log('**NEXT**')
  }, 5000)
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
