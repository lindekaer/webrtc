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
    this.iceIds = [];
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
    const message = JSON.parse(rawMessage.data);
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
    // console.log('message: ' + JSON.stringify(message))
    if (message.iceIds) {
      console.log('Got offer');
      // console.log('Got ids too: ' + JSON.stringify(message.iceIds[1]))
      this.iceIds = message.iceIds;
      const offer = new window.RTCSessionDescription(message.payload);
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
      if (this.isHostIceCandidate(message.candidate)) {
        var candidate = this.constructIceStringsFromLocalHostCandidate(message.candidate);
        // peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
        console.log('Adding artificial ICE now');
        peerConnection.addIceCandidate(new window.RTCIceCandidate(candidate));
      }
      // peerConnection.addIceCandidate(new window.RTCIceCandidate(message))
    }
  }

  isHostIceCandidate(candidate) {
    return candidate.indexOf('host') > -1;
  }

  constructIceStringsFromLocalHostCandidate(candidate) {
    // Get port number
    var port = this.findPortInCandidate(candidate);
    // console.log('Port is: ' + port)
    var ufrag = this.findUfragInCandidate(candidate);
    // console.log('Ufrag is: ' + ufrag)
    var ip = this.findLocalIpFromCandidate(candidate);
    // console.log('IP is: ' + ip)
    var candidateString = `${ this.iceIds[1] } ${ port } typ srflx raddr ${ ip } rport ${ port } generation 0 ufrag ${ ufrag } network-cost 50`;
    var candidate = {
      candidate: candidateString,
      sdpMid: 'data',
      sdpMLineIndex: 0
    };
    // console.log(JSON.stringify(candidate))
    return candidate;
  }

  findPortInCandidate(candidate) {
    var startIndex = 0;
    var endIndex = 0;
    for (var i = 0; i < 5; i++) {
      startIndex = candidate.indexOf(' ', startIndex + 1);
    }
    endIndex = candidate.indexOf(' ', startIndex + 1);
    return candidate.substring(startIndex + 1, endIndex);
  }

  findUfragInCandidate(candidate) {
    var startIndex = 0;
    var endIndex = 0;
    var ufragIndex = candidate.indexOf('ufrag', startIndex);
    startIndex = ufragIndex + 6;
    endIndex = startIndex + 4;
    return candidate.substring(startIndex, endIndex);
  }

  findLocalIpFromCandidate(candidate) {
    var startIndex = 0;
    var endIndex = 0;
    for (var i = 0; i < 4; i++) {
      startIndex = candidate.indexOf(' ', startIndex + 1);
    }
    endIndex = candidate.indexOf(' ', startIndex + 1);
    return candidate.substring(startIndex + 1, endIndex);
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