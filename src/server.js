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
var connectedCount = 0

wss.on('connection', (ws) => {
  connectedCount++
  console.log(`Opened! ${connectedCount} connected.`)

  ws.on('message', onMessage)
  ws.on('close', onClose)
})

function onMessage (message) {
  const msg = JSON.parse(message)
  if (msg.type === 'joining') {
    peers[msg.uuid] = this

    // Ensure to set the first peer
    if (!firstPeer) {
      firstPeer = this
      offers.push({ payload: msg.payload, uuid: msg.uuid, type: 'offer' })
      return
    }

    while (!sendOfferToPeer(this, msg)) {
      console.log('Retrying...')
    }
  }

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
    firstPeer.send(mess)
  }

  if (msg.type === 'offer-for-walker') {
    walker.send(JSON.stringify(msg.payload))
  }

  if (msg.type === 'walker-request-answer') {
    firstPeer.send(JSON.stringify(msg))
  }
}

function onClose () {
  connectedCount--
  console.log(`Closed! ${connectedCount} connected.`)
  if (connectedCount === 0) {
    firstPeer = undefined
    walker = undefined
    peers = {}
    offers = []
  }
}

function sendOfferToPeer (peer, message) {
  var offer = offers.shift()
  if (!offer) return false
  peer.send(JSON.stringify(offer))
  offers.push({ payload: message.payload, uuid: message.uuid, type: 'offer' })
  return true
}
