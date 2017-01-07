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
var firstPeer
var walker

wss.on('connection', (ws) => {
  // Save reference to first peer
  ws.on('message', onMessage)
})

function onMessage (message) {
  const msg = JSON.parse(message)
  if (msg.type === 'joining') {
    if (Object.keys(peers).length === 0) {
      console.log('setting first peer')
      firstPeer = this
    } else {
      console.log('Lenght of peers: ', Object.keys(peers).length)
    }
    peers[msg.uuid] = this
     // If there are any offers, send the first-received to the connecting peer
    if (offers.length !== 0) {
      console.log('Sending offer...')
      var offer = offers.shift()
      this.send(JSON.stringify(offer))
    }
    offers.push({ payload: msg.payload, uuid: msg.uuid, type: 'offer' })
  }

  // if (msg.type === 'offer') {
  //   offers.push({ payload: msg.payload, uuid: msg.uuid, type: 'offer' })
  // }

  if (msg.type === 'answer') {
    peers[msg.uuid].send(JSON.stringify({ payload: msg.payload, type: 'answer' }))
  }

  if (msg.type === 'walker-request') {
    // Save reference to walker socket
    console.log('walker request')
    walker = this
    // Notify first peer about walker
    firstPeer.send(JSON.stringify({ type: 'walker-request' }))
  }

  if (msg.type === 'walker-request-offer') {
    console.log('sending offer to walker')
    walker.send(JSON.stringify(msg.payload))
  }

  if (msg.type === 'walker-request-answer') {
    firstPeer.send(JSON.stringify(msg))
  }
}
