
/*
-----------------------------------------------------------------------------------
|
| WebRTC Setup
|
-----------------------------------------------------------------------------------
*/

var initializedCon = new RTCPeerConnection(iceConfig)
var recievedCon = new RTCPeerConnection(iceConfig)
var readyCon = new RTCPeerConnection(iceConfig)
var initializedChannel
var recievedChannel
var readyChannel
setUpPeerConnection(initializedCon)
setUpPeerConnection(recievedCon)
setUpPeerConnection(readyCon)
setupReadyCon()
var waitingOffer
var readyOffer

// DOM elements
let generateBtn = document.querySelector('#generate-offer')
let consumeBtn = document.querySelector('#consume-sdp')
let sdp = document.querySelector('#sdp')
let walkerBtn = document.querySelector('#consume-walker-offer')
let showWalkerOffer = document.querySelector('#show-walker-offer')

var iceConfig = {
  iceServers: [
    { url: 'stun:23.21.150.121' }
  ]
}

// Config for a 'data-only' offer
var mediaConstraints = {
  mandatory: {
    OfferToReceiveAudio: false,
    OfferToReceiveVideo: false
  }
}

showWalkerOffer.addEventListener('click', function () {
  printSdp(JSON.parse(readyOffer))
})

walkerBtn.addEventListener('click', function () {
  var data = JSON.parse(sdp.value)
  var answer = new RTCSessionDescription(data)
  readyCon.setRemoteDescription(answer)
})

// Create offer for the initializedCon
generateBtn.addEventListener('click', function () {
  // setUpPeerConnection(initializedCon)

  var dataChannel = initializedCon.createDataChannel('fun-channel')
  // Setup handlers for the locally create channel
  handleChannel(dataChannel)
  initializedChannel = dataChannel

  // Create the offer for a p2p connection
  initializedCon.createOffer(handleOfferInit, function () {}, mediaConstraints)
  initializedCon.onicecandidate = function (candidate) {
    // When there are no more candidates...
    if (candidate.candidate == null) {
      // Print the offer in the DOM
      printSdp(initializedCon.localDescription)
    }
  }
})

// Listener for comsune buttom
consumeBtn.addEventListener('click', function () {
  var data = JSON.parse(sdp.value)
  var json = new RTCSessionDescription(data)
  if (json.type === 'offer') {
    // the data is an offer and will be set up on recievingCon
    var offer = new RTCSessionDescription(data)
    recievedCon.onicecandidate = function (candidate) {
      if (candidate.candidate == null) {
        printSdp(recievedCon.localDescription)
      }
    }
    recievedCon.setRemoteDescription(offer, function () {
      recievedCon.createAnswer(function (answer) {
        recievedCon.setLocalDescription(answer)
      }, function (err) {})
    })
  } else if (json.type === 'answer') {
    // the data is an answer and will be set up on initializedCon
    var answer = new RTCSessionDescription(data)
    initializedCon.setRemoteDescription(answer)
    // After this, the connection is established...
  }
})

/*
-----------------------------------------------------------------------------------
|
| Utility functions
|
-----------------------------------------------------------------------------------
*/

function handleChannel (channel) {
  // Log new messages
  channel.onmessage = function (msg) {
    console.log('Getting data')
    console.log(msg)
    handleMessage(JSON.parse(msg.data), channel)
    waitingOffer = msg.data
  }
  // Other events
  channel.onerror = function (err) { console.log(err) }
  channel.onclose = function () { console.log('Closed!') }
  channel.onopen = function (evt) { console.log('Opened') }
}

function setUpPeerConnection (peerConnection) {
  peerConnection.ondatachannel = function (evt) {
    var channel = evt.channel
    recievedChannel = channel
    channel.onopen = function () {
      console.log('Im now open.')
      channel.send('Hi there')
    }
    channel.onmessage = function (msg) {
      console.log(msg)
      handleMessage(JSON.parse(msg.data), channel)
    }
    channel.onerror = function (err) { console.log(err) }
    channel.onclose = function () { console.log('Closed!') }
    channel.onopen = function (evt) { console.log('Opened'); channel.send(readyOffer) }
  }
}

function setupReadyCon () {
  var dataChannelReady = readyCon.createDataChannel('ready-channel')
  // Setup handlers for the locally create channel
  handleChannel(dataChannelReady)
  // Config for a 'data-only' offer
  var readyChannel = dataChannelReady
  // Create the offer for a p2p connection
  readyCon.createOffer(handleOfferReady, function () {}, mediaConstraints)
  readyCon.onicecandidate = function (candidate) {
    // When there are no more candidates...
    if (candidate.candidate == null) {
      // Print the offer in the DOM
      console.log('Ready-offer: ', readyCon.localDescription)
      readyOffer = JSON.stringify({
        type: 'waiting',
        data: readyCon.localDescription
      })
    }
  }
}

function handleMessage (message, channel) {
  console.log(message)
  switch (message.type) {
    case 'waiting':
      console.log('waiting')
      waitingOffer = JSON.stringify(message.data)
      break
    case 'walkerToMiddle':
      initializedChannel.send(JSON.stringify({
        type: 'middleToNext',
        data: message.data
      }))
      console.log('walkerToMiddle')
      break
    case 'middleToNext':
      var answer = new RTCSessionDescription(message.data)
      readyCon.setRemoteDescription(answer)
      console.log('middleToNext')
      break
    case 'sendWaiting':
      console.log('sendWaiting')
      channel.send(waitingOffer)
      break
    default: console.log('No type: ')
  }
}

function handleOfferInit (offer) {
  // Set local description
  initializedCon.setLocalDescription(offer)
}

function handleOfferReady (offer) {
  // Set local description
  readyCon.setLocalDescription(offer)
}

function printSdp (sdp) {
  // Print it to the DOM
  var generatedOffer = document.querySelector('#generated-content')
  generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)
}
