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
var currentOffer = {}
var waiting = []
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
      console.log('Setting first peer from: ' + msg.containerUuid + ' with id: ' + msg.uuid)
      firstPeer = this
      currentOffer = { payload: msg.payload, uuid: msg.uuid, type: 'offer', containerUuid: msg.containerUuid }
      return
    }
    // var offer = currentOffer[0]
    if (msg.containerUuid === currentOffer.containerUuid) {
      console.log('Setting peer to wait, from: ' + msg.containerUuid + ' with id: ' + msg.uuid)
      waiting.push({ payload: msg.payload, uuid: msg.uuid, type: 'offer', containerUuid: msg.containerUuid })
    } else {
      while (!sendOfferToPeer(this, msg)) {
        console.log('Retrying...')
      }
      console.log('Checking waiting...')
      var morePotentialWaiting = true
      while (morePotentialWaiting) {
        var lastOffer = currentOffer
        var somethingFound = false
        for (var i = 0; i < waiting.length; i++) {
          const waitingOffer = waiting[i]
          if (waitingOffer.containerUuid !== lastOffer.containerUuid) {
            console.log('Found one! connecting to peer from: ' + waitingOffer.containerUuid + ' with id: ' + waitingOffer.uuid)
            while (!sendOfferToPeer(peers[waitingOffer.uuid], waitingOffer)) {
              console.log('Retrying...')
            }
            waiting.splice(i, 1)
            somethingFound = true
            break
          }
        }
        morePotentialWaiting = somethingFound
      }
      console.log('Done checking waiting.')
    }
  }

  if (msg.type === 'answer') {
    console.log('Sending answer to: ' + msg.toUuid + ' from: ' + msg.uuid)
    peers[msg.toUuid].send(JSON.stringify({ payload: msg.payload, type: 'answer' }))
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
    currentOffer = {}
  }
}

function sendOfferToPeer (peer, message) {
  console.log('Sending offer from ' + currentOffer.uuid + ' to: ' + message.containerUuid + ' with id: ' + message.uuid)
  // var offer = currentOffer.shift()
  if (!currentOffer) return false
  peer.send(JSON.stringify(currentOffer))
  // console.log('Setting peers offer to be last offer.')
  currentOffer = { payload: message.payload, uuid: message.uuid, type: 'offer', containerUuid: message.containerUuid }
  return true
}
