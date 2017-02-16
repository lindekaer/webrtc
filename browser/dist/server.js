'use strict';

/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var WebSocketServer = require('uws').Server;
var wss = new WebSocketServer({ port: 9000 });

/*
-----------------------------------------------------------------------------------
|
| Signaling server configuration
|
-----------------------------------------------------------------------------------
*/

const peers = {};
var lastPeer;
var firstPeer;
var connectedCount = 0;
var walker;
var iceIdsForNextPeer = [];

wss.on('connection', ws => {
  connectedCount++;
  console.log(`Opened! ${ connectedCount } connected.`);

  ws.on('message', onMessage);
  ws.on('close', onClose);
});

function onMessage(message) {
  const msg = JSON.parse(message);
  switch (msg.type) {
    case 'joining':
      joining(msg, this);
      break;
    case 'answer-for-joining':
      answerForJoining(msg);
      break;
    case 'walker-request':
      walkerRequest(msg, this);
      break;
    case 'offer-for-walker':
      offerForWalker(msg);
      break;
    case 'answer-from-walker-relay':
      answerFromWalkerRelay(msg);
      break;
    case 'ice-candidate-for-walker':
      iceCandidateForWalker(msg);
      break;
    case 'ice-candidate-for-peer-relay':
      iceCandidateForPeer(msg);
      break;
    default:
      console.log('No message type');
      console.log(message);
  }
}

function onClose() {
  connectedCount--;
  console.log(`Closed! ${ connectedCount } connected.`);
}

const joining = (msg, socket) => {
  peers[msg.joinerId] = socket;
  if (!lastPeer) {
    firstPeer = socket;
    lastPeer = socket;
    iceIdsForNextPeer = getIdStringsFromOffer(JSON.stringify(msg.payload.sdp));
    return;
  }
  lastPeer.send(JSON.stringify(msg));
  lastPeer = socket;
};

const answerForJoining = msg => {
  peers[msg.joinerId].send(JSON.stringify(msg));
};

const walkerRequest = (msg, socket) => {
  // Save reference to walker socket
  walker = socket;
  // Notify first peer about walker
  var message = JSON.stringify({
    type: 'request-offer-for-walker',
    walkerId: msg.uuid
  });
  firstPeer.send(message);
};

const offerForWalker = msg => {
  walker.send(JSON.stringify({
    payload: msg.payload,
    iceIds: iceIdsForNextPeer
  }));
};

const answerFromWalkerRelay = msg => {
  firstPeer.send(JSON.stringify({
    type: 'answer-from-walker-destination',
    data: msg.payload,
    walkerId: msg.walkerId
  }));
};

const iceCandidateForWalker = msg => {
  walker.send(JSON.stringify(msg.payload));
};

const iceCandidateForPeer = msg => {
  firstPeer.send(JSON.stringify({
    type: 'ice-candidate-for-peer',
    payload: msg.payload,
    walkerId: msg.uuid
  }));
};

const getIdStringsFromOffer = offer => {
  var startIndex = 0,
      index,
      strings = [];
  while ((index = offer.indexOf('candidate:', startIndex)) > -1) {
    var localIndex = index;
    for (var i = 0; i < 4; i++) {
      localIndex = offer.indexOf(' ', localIndex + 1);
    }
    var substring = offer.substring(index, localIndex);
    strings.push(substring);
    startIndex = index + 'candidate:'.length;
  }
  return strings;
};