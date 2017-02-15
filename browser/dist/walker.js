'use strict';

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
-----------------------------------------------------------------------------------
|
| Imports
|
-----------------------------------------------------------------------------------
*/

// import webrtc from 'wrtc'
// import WebSocket from 'uws'
const Log = console.log;
console.log = msg => {
  const data = Date.now() + ' - ' + msg;
  Log(data);
  document.querySelector('#info').textContent = document.querySelector('#info').textContent + '#!#' + data;
};

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class WalkerPeer {
  constructor() {
    this._uuid = _uuid2.default.v1();
    this.connectToServer();
  }

  connectToServer() {
    this._socket = new window.WebSocket(_config2.default.webSocketUrl);
    this._socket.onopen = this.onSocketOpen.bind(this);
    this._socket.onmessage = this.onSocketMessage.bind(this);
  }

  onSocketOpen() {
    this.init();
  }

  onSocketMessage(rawMessage) {
    const message = JSON.parse(rawMessage);
    this.handleMessage(message, this._currentCon, this._socket);
  }

  init() {
    this._currentCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._nextCon;
    this._nodeCount = 0;
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    });
    this._socket.send(msg);
  }

  handleMessage(message, peerConnection, channel) {
    if (message.sdp) {
      const offer = new window.RTCSessionDescription(message);
      this.handleDataChannels(peerConnection);
      peerConnection.setRemoteDescription(offer, () => {
        peerConnection.onicecandidate = event => {
          if (event.candidate == null) {
            // TODO: Send end of candidates event
          } else {
            if (event.candidate) {
              const jsonOffer = JSON.stringify({
                type: 'ice-candidate-for-peer-relay',
                payload: event.candidate,
                uuid: this._uuid
              });
              channel.send(jsonOffer);
            }
          }
        };
        peerConnection.createAnswer(answer => {
          peerConnection.setLocalDescription(answer);
          channel.send(JSON.stringify({
            type: 'answer-from-walker-relay',
            payload: peerConnection.localDescription,
            walkerId: this._uuid
          }));
        }, errorHandler);
      }, errorHandler);
    } else {
      console.log(JSON.stringify(message));
      peerConnection.addIceCandidate(new window.RTCIceCandidate(message));
    }
  }

  // 'walker-request-answer'
  handleDataChannels(peerConnection) {
    peerConnection.ondatachannel = event => {
      const channel = event.channel;

      channel.onmessage = msg => {
        const message = JSON.parse(msg.data);
        this.handleMessage(message, this._nextCon, channel);
      };

      channel.onopen = evt => {
        this._currentCon = this._nextCon;
        this._nextCon = new window.RTCPeerConnection(_config2.default.iceConfig);
        this._nodeCount++;
        console.log('Connection established to node ' + this._nodeCount);
        channel.send(JSON.stringify({
          type: 'get-offer-from-next-peer',
          walkerId: this._uuid
        }));
      };
    };
  }
}

const newPeer = new WalkerPeer();
console.log('I am a walker and my ID is: ' + newPeer._uuid);

/*
-----------------------------------------------------------------------------------
|
| Utility functions
|
-----------------------------------------------------------------------------------
*/

function errorHandler(err) {
  console.log(err);
}