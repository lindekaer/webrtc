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
  // If there are any offers, send the first-received to the connecting peer
  if (offers.length !== 0) {
    console.log('Sending offer...')
    ws.send(JSON.stringify(offers.shift()))
  }

  ws.on('message', onMessage)
})

function onMessage (message) {
  const msg = JSON.parse(message)

  if (msg.type === 'joining') {
    peers[msg.uuid] = this
  }

  if (msg.type === 'offer') {
    offers.push({ payload: msg.payload, uuid: msg.uuid, type: 'offer' })
  }

  if (msg.type === 'answer') {
    peers[msg.uuid].send(JSON.stringify({ payload: msg.payload, type: 'answer' }))
  }
}
