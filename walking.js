
/*
-----------------------------------------------------------------------------------
|
| WebRTC Setup
|
-----------------------------------------------------------------------------------
*/

// Variables
var currentCon = new RTCPeerConnection(iceConfig)
var nextCon
var nodeCount = 0

// DOM elements
let consumeBtn = document.querySelector('#consume-sdp')
let sdp = document.querySelector('#sdp')
var iceConfig = {
  iceServers: [
    { url: 'stun:23.21.150.121' }
  ]
}

// Listen for events to consume SDP message
consumeBtn.addEventListener('click', function () {
  var data = JSON.parse(sdp.value)
  // the data is an offer and will be set up on recievingCon
  var offer = new RTCSessionDescription(data.data)
  handleDataChannels(currentCon)
  // setUpPeerConnection(recievedCon)
  currentCon.onicecandidate = function (candidate) {
    if (candidate.candidate == null) {
      printSdp(currentCon.localDescription)
    }
  }
  currentCon.setRemoteDescription(offer, function () {
    currentCon.createAnswer(function (answer) {
      currentCon.setLocalDescription(answer)
    }, function (err) {})
  })
})

/*
-----------------------------------------------------------------------------------
|
| Utility functions
|
-----------------------------------------------------------------------------------
*/

function printSdp (sdp) {
  // Print it to the DOM
  var generatedOffer = document.querySelector('#generated-content')
  generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)
}

function handleDataChannels (peerConnection, isFirst) {
  peerConnection.ondatachannel = function (evt) {
    var channel = evt.channel
    channel.onmessage = function (msg) {
      var data = JSON.parse(msg.data)
      var recieved = new RTCSessionDescription(data.data)
      if (!isFirst) {
        currentCon = nextCon
      }
      nextCon = new RTCPeerConnection(iceConfig)
      handleDataChannels(nextCon)
      nextCon.onicecandidate = function (candidate) {
        if (candidate.candidate == null) {
          channel.send(JSON.stringify({type: 'walkerToMiddle', data: nextCon.localDescription}))
        }
      }
      nextCon.setRemoteDescription(recieved, function () {
        nextCon.createAnswer(function (answer) {
          nextCon.setLocalDescription(answer)
        }, function (err) {})
      })
    }

    channel.onerror = function (err) { console.log(err) }
    channel.onclose = function () { console.log('Closed!') }
    channel.onopen = function (evt) {
      nodeCount++
      console.log('Connection established to node ' + nodeCount + ' @ ' + Date.now())
      channel.send(JSON.stringify({type: 'sendWaiting'}))
    }
  }
}
