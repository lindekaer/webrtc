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
    var mess = JSON.stringify({
      type: 'request-offer-for-walker',
      walkerId: msg.uuid
    })
    console.log('Now sending: ', mess)
    firstPeer.send(mess)
  }

  if (msg.type === 'offer-for-walker') {
    walker.send(JSON.stringify(msg.payload))
  }

  if (msg.type === 'walker-request-answer') {
    firstPeer.send(JSON.stringify(msg))
  }
}
