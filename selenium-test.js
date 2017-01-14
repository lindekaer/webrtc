/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var webdriver = require('selenium-webdriver')
var until = require('selenium-webdriver').until
var By = require('selenium-webdriver').By
var chrome = require('selenium-webdriver/chrome')

/*
-----------------------------------------------------------------------------------
|
| Test
|
-----------------------------------------------------------------------------------
*/

// Get the command line args
var type = process.argv[2]

// Setup driver
var driver = new webdriver.Builder()
  .forBrowser('chrome')
  .setChromeOptions(new chrome.Options().addArguments('--no-sandbox'))
  .build()

// Load the local HTML file
driver.get(`file:///app/${type}.html`)

// Run the actual test
var infoElement = driver.findElement(By.id('info'))
driver.wait(until.elementIsVisible(infoElement))
infoElement.getText().then(text => {
  // Construct array
  var arr = text.split('#!#')
  // Remove first empty item
  arr.shift()
  console.log('\n--- OUTPUT ---')
  for (let item of arr) {
    console.log(item)
  }
  console.log('\n')
})

driver.quit()
