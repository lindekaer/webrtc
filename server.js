/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var WebSocketServer = require('uws').Server
var wss = new WebSocketServer({ port: 8080 })

/*
-----------------------------------------------------------------------------------
|
| Signaling server configuration
|
-----------------------------------------------------------------------------------
*/

var peers = {}
var offers = []

wss.on('connection', (ws) => {
  // Send latest offer to new peer
  console.log('--- OFFER ----')
  console.log(offers[0])
  console.log(typeof offers[0])
  console.log('---------------------')
  if (offers.length !== 0) ws.send(JSON.stringify(offers.shift()))

  ws.on('message', onMessage)
})

function onMessage (message) {
  message = JSON.parse(message)

  if (message.type === 'joining') {
    peers[message.uuid] = this
  }

  if (message.type === 'offer') {
    offers.push({ payload: message.data, uuid: message.uuid })
  }

  if (message.type === 'answer') {
    console.log('****')
    console.log(message)
    console.log('****')
    peers[message.uuid].send(JSON.stringify({ payload: message.payload }))
  }

  console.log(message)
}
