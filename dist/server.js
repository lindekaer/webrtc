'use strict';

/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

var WebSocketServer = require('uws').Server;
var wss = new WebSocketServer({ port: 8080 });

/*
-----------------------------------------------------------------------------------
|
| Signaling server configuration
|
-----------------------------------------------------------------------------------
*/

var peers = {};
var lastPeer;
var firstPeer;
var connectedCount = 0;
var walker;
var waiting = [];
var connectedToChainCount = 0;

wss.on('connection', ws => {
  connectedCount++;
  console.log(`Opened! ${connectedCount} connected.`);

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
  console.log(`Closed! ${connectedCount} connected.`);
  if (connectedCount === 0) {
    firstPeer = undefined;
    lastPeer = undefined;
    walker = undefined;
    peers = {};
  }
}

const joining = (msg, socket) => {
  peers[msg.joinerId] = socket;
  console.log('Total peers: ' + Object.keys(peers).length);
  if (!lastPeer) {
    console.log('Setting first peer');
    firstPeer = socket;
    lastPeer = {
      socket: socket,
      containerUuid: msg.containerUuid
    };
    connectedToChainCount++;
    return;
  }
  if (msg.containerUuid === lastPeer.containerUuid) {
    // console.log('Setting peer to wait from: ' + msg.containerUuid)
    waiting.push(msg);
    console.log('Waiting peers: ' + waiting.length);
  } else {
    sendJoinMessageToLastPeer(msg, socket);
    // lastPeer.socket.send(JSON.stringify(msg))
    // lastPeer = {
    //   socket: socket,
    //   containerUuid: msg.containerUuid
    // }
    // console.log('Checking waiting...')
    var morePotentialWaiting = true;
    while (morePotentialWaiting) {
      var somethingFound = false;
      for (var i = 0; i < waiting.length; i++) {
        const waitingPeer = waiting[i];
        if (waitingPeer.containerUuid !== lastPeer.containerUuid) {
          // console.log('Found one! connecting to peer from: ' + waitingPeer.containerUuid)// + ' with id: ' + waitingPeer.joinerId)
          waiting.splice(i, 1);
          sendJoinMessageToLastPeer(waitingPeer, peers[waitingPeer.joinerId]);
          // lastPeer.socket.send(JSON.stringify(waitingPeer))
          // lastPeer = {
          //   socket:,
          //   containerUuid: msg.containerUuid
          // }
          somethingFound = true;
          break;
        }
      }
      morePotentialWaiting = somethingFound;
    }
    // console.log('Done checking')
  }
};

const sendJoinMessageToLastPeer = (msg, fromSocket) => {
  console.log('-----------------------------------------------');
  console.log('Setting lastPeer to: ' + msg.containerUuid);
  connectedToChainCount++;
  console.log('Peers in chain: ' + connectedToChainCount);
  console.log('Waiting peers: ' + waiting.length);
  lastPeer.socket.send(JSON.stringify(msg));
  lastPeer = {
    socket: fromSocket,
    containerUuid: msg.containerUuid
  };
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
  walker.send(JSON.stringify(msg.payload));
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