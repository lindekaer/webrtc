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

// Setup driver
var driver = new webdriver.Builder()
  .forBrowser('chrome')
  .setChromeOptions(new chrome.Options().addArguments('--no-sandbox'))
  .build()

// Load the local HTML file
driver.get('file:///app/index.html')

// Run the actual test
var infoElement = driver.findElement(By.id('info'))
driver.wait(until.elementIsVisible(infoElement))
infoElement.getText().then(text => console.log(text))
driver.quit()
