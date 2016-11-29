/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

import webrtc from 'wrtc'

/*
-----------------------------------------------------------------------------------
|
| Peer 1
|
-----------------------------------------------------------------------------------
*/

const pc1 = new webrtc.RTCPeerConnection()
const dataChannel = pc1.createDataChannel()

var errorHandler = function (err) {
  console.error(err)
}

var options = {
  offerToReceiveAudio: false,
  offerToReceiveVideo: false
}

pc1.createOffer(function (offer) {
  console.log('Offer done!')
  pc1.setLocalDescription(offer, function () {
    console.log('Desc set!')
  }, errorHandler)
}, errorHandler, options)

pc1.onicecandidate = function (event) {
  if (event.candidate === null) {
    sendOffer(pc1.localDescription)
  }
}


/*
-----------------------------------------------------------------------------------
|
| Peer 2
|
-----------------------------------------------------------------------------------
*/

const pc2 = new webrtc.RTCPeerConnection()

function sendOffer (offer) {
  pc2.setRemoteDescription(offer)
  console.log('Peer2: Set remote desc')
  pc2.createAnswer(function (answer) {
    console.log('Peer2: Created answer')
    pc2.setLocalDescription(answer, function () {
      console.log('Peer2: Set local description')
    }, errorHandler)
  }, errorHandler)
}

pc2.onicecandidate = function (event) {
  console.log('Get candiate on peer2!')
  if (event.candidate === null) {
    send(pc2.localDescription)
  }
}

sendAnswer (answer) {
  
}
