'use strict';

var _wrtc = require('wrtc');

/*
-----------------------------------------------------------------------------------
|
| Peer 1
|
-----------------------------------------------------------------------------------
*/

// Setup of P2P connection and data channel
const pc1 = new _wrtc.RTCPeerConnection(); /*
                                           -----------------------------------------------------------------------------------
                                           |
                                           | Imports
                                           |
                                           -----------------------------------------------------------------------------------
                                           */

const pcx = new _wrtc.RTCPeerConnection();
const dc = pc1.createDataChannel();
const dcx = pcx.createDataChannel();

// Add event handlers on data channel
dc.onopen = () => console.log('Peer 1: Data channel is open!');
dc.onmessage = event => console.log(`Peer 1: Got message: "${ event.data }"`);

var errorHandler = function errorHandler(err) {
  console.error(err);
};

var options = {
  offerToReceiveAudio: false,
  offerToReceiveVideo: false
};

// Create an offer with the specified options
pc1.createOffer(offer => {
  // Set the offer as the local description
  pc1.setLocalDescription(offer, () => {
    console.log('Peer 1: Setting local description');
  }, errorHandler);
}, errorHandler, options);

// Event handler for candidates
pc1.onicecandidate = event => {
  console.log('Peer 1: Found an ICE candidate!');
  // This fires when no more candidates are to be found
  if (event.candidate === null) {
    // Send offer to Peer2
    sendOffer(pc1.localDescription);
  }
};

pcx.createOffer(offer => {
  // Set the offer as the local description
  pc1.setLocalDescription(offer, () => {
    console.log('Peer x: Setting local description');
  }, errorHandler);
}, errorHandler, options);

/*
-----------------------------------------------------------------------------------
|
| Peer 2
|
-----------------------------------------------------------------------------------
*/

// Setup of P2P connection
const pc2 = new _wrtc.RTCPeerConnection();

function sendOffer(offer) {
  // Set the offer from Peer1 as remote description
  pc2.setRemoteDescription(offer);
  // Create an answer
  pc2.createAnswer(answer => {
    // Set the answer as the local description
    pc2.setLocalDescription(answer, () => {}, errorHandler);
  }, errorHandler);
}

pc2.onicecandidate = event => {
  console.log('Peer 2: Found an ICE candidate!');
  // This fires when no more candidates are to be found
  if (event.candidate === null) {
    // Send offer to Peer1
    sendAnswer(pc2.localDescription);
  }
};

function sendAnswer(answer) {
  pcx.setRemoteDescription(answer);
}

pc2.ondatachannel = event => {
  event.channel.send('The zebra is superior at playing the violin, word.');
};