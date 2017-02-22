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
var lastPeer
var firstPeer
var connectedCount = 0
var walker

wss.on('connection', (ws) => {
  connectedCount++
  console.log(`Opened! ${connectedCount} connected.`)

  ws.on('message', onMessage)
  ws.on('close', onClose)
})

function onMessage (message) {
  const msg = JSON.parse(message)
  switch (msg.type) {
    case 'joining':
      joining(msg, this)
      break
    case 'answer-for-joining':
      answerForJoining(msg)
      break
    case 'walker-request':
      walkerRequest(msg, this)
      break
    case 'offer-for-walker':
      offerForWalker(msg)
      break
    case 'answer-from-walker-relay':
      answerFromWalkerRelay(msg)
      break
    case 'ice-candidate-for-walker':
      iceCandidateForWalker(msg)
      break
    case 'ice-candidate-for-peer-relay':
      iceCandidateForPeer(msg)
      break
    default:
      console.log('No message type')
      console.log(message)
  }
}

function onClose () {
  connectedCount--
  console.log(`Closed! ${connectedCount} connected.`)
  if (connectedCount === 0) {
    firstPeer = undefined
    lastPeer = undefined
    walker = undefined
    peers = {}
  }
}

const joining = (msg, socket) => {
  peers[msg.joinerId] = socket
  if (!lastPeer) {
    firstPeer = socket
    lastPeer = socket
    return
  }
  lastPeer.send(JSON.stringify(msg))
  lastPeer = socket
}

const answerForJoining = (msg) => {
  peers[msg.joinerId].send(JSON.stringify(msg))
}

const walkerRequest = (msg, socket) => {
  // Save reference to walker socket
  walker = socket
  // Notify first peer about walker
  var message = JSON.stringify({
    type: 'request-offer-for-walker',
    walkerId: msg.uuid
  })
  firstPeer.send(message)
}

const offerForWalker = (msg) => {
  walker.send(JSON.stringify(msg.payload))
}

const answerFromWalkerRelay = (msg) => {
  firstPeer.send(JSON.stringify({
    type: 'answer-from-walker-destination',
    data: msg.payload,
    walkerId: msg.walkerId
  }))
}

const iceCandidateForWalker = (msg) => {
  walker.send(JSON.stringify(msg.payload))
}

const iceCandidateForPeer = (msg) => {
  firstPeer.send(JSON.stringify({
    type: 'ice-candidate-for-peer',
    payload: msg.payload,
    walkerId: msg.uuid
  }))
}
