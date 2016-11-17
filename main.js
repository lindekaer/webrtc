// /*
// -----------------------------------------------------------------------------------
// |
// | Web socket server connection
// |
// -----------------------------------------------------------------------------------
// */
//
// var ws = new window.WebSocket('ws://localhost:3000/websocket')
// ws.onmessage = (msg) => {
//   console.log(msg)
// }
// ws.onopen = () => {
//   initWebRtc()
// }

initWebRtc()

/*
-----------------------------------------------------------------------------------
|
| WebRTC Setup
|
-----------------------------------------------------------------------------------
*/

function initWebRtc () {
  var mode = window.location.hash.substr(1) || 'join'

  var iceConfig = {
    iceServers: [
      { url: 'stun:23.21.150.121' }
    ]
  }

  if (mode === 'init') {
    var peerConnection = new RTCPeerConnection(iceConfig)
    var dataChannel = peerConnection.createDataChannel('fun-channel')
    // Setup handlers for the locally create channel
    handleChannel(dataChannel)
    // Config for a 'data-only' offer
    var mediaConstraints = {
      mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
      }
    }
    // Create the offer for a p2p connection
    peerConnection.createOffer(handleOffer, function () {}, mediaConstraints)
    peerConnection.onicecandidate = function (candidate) {
      // When there are no more candidates...
      if (candidate.candidate == null) {
        // Print the offer in the DOM
        printSdp(peerConnection.localDescription)
      }
    }

    // Listen for events to consume SDP message
    let consumeBtn = document.querySelector('#consume-sdp')
    let sdp = document.querySelector('#sdp')
    consumeBtn.addEventListener('click', function () {
      var data = JSON.parse(sdp.value)
      var answer = new RTCSessionDescription(data)
      peerConnection.setRemoteDescription(answer)
      console.log('Opened: ' + Date.now())
      // After this, the connection is established...
    })
  }

  if (mode !== 'init') {
    // Listen for events to consume SDP message
    let consumeBtn = document.querySelector('#consume-sdp')
    let sdp = document.querySelector('#sdp')
    consumeBtn.addEventListener('click', function () {
      var data = JSON.parse(sdp.value)
      var offer = new RTCSessionDescription(data)
      var peerConnection = new RTCPeerConnection(iceConfig)
      handleDataChannels(peerConnection)
      peerConnection.onicecandidate = function (candidate) {
        if (candidate.candidate == null) {
          printSdp(peerConnection.localDescription)
        }
      }
      peerConnection.setRemoteDescription(offer, function () {
        peerConnection.createAnswer(function (answer) {
          peerConnection.setLocalDescription(answer)
        }, function (err) {})
      })
    })
  }

  /*
  -----------------------------------------------------------------------------------
  |
  | Utility functions
  |
  -----------------------------------------------------------------------------------
  */

  function handleChannel (channel) {
    // Send message through channel
    var msg = document.querySelector('#msg')
    var send = document.querySelector('#send')
    send.addEventListener('click', function () {
      channel.send(msg.value)
    })

    // Log new messages
    channel.onmessage = function (msg) {
      console.log(msg.data)
    }

    // Other events
    channel.onerror = function (err) { console.log(err) }
    channel.onclose = function () { console.log('Closed!') }
    channel.onopen = function (evt) { console.log(channel); channel.send('DataChannel connection established. Welcome!') }
  }

  function handleOffer (offer) {
    // Set local description
    peerConnection.setLocalDescription(offer)
  }

  function printSdp (sdp) {
    // Print it to the DOM
    var generatedOffer = document.querySelector('#generated-content')
    generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)

    // // Add ID and send to server
    // var data = {
    //   id: uuid(),
    //   data: sdp
    // }
    // ws.send(JSON.stringify(data))
  }

  function handleDataChannels (peerConnection) {
    peerConnection.ondatachannel = function (evt) {
      var channel = evt.channel
      channel.onopen = function () { console.log('Opened: ' + Date.now()) }
      var msg = document.querySelector('#msg')
      var send = document.querySelector('#send')
      send.addEventListener('click', function () {
        channel.send(msg.value)
      })
      channel.send('Hi, I am the joining peer with id: ' + Date.now())
      channel.onmessage = function (evt) {
        console.log(evt.data)
      }
    }
  }
}

/*
-----------------------------------------------------------------------------------
|
| Utility functions
|
-----------------------------------------------------------------------------------
*/

function uuid () {
  var d = new Date().getTime()
  if (window.performance && typeof window.performance.now === 'function') {
    d += window.performance.now() // use high-precision timer if available
  }
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r&0x3 | 0x8)).toString(16)
  })
  return uuid
}
