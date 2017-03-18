'use strict';

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
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
    this.myIds = [];
    this._requestTimeSend = Date.now();
    this.connectToServer();
  }

  connectToServer() {
    console.log('Connected to server...');
    this._signalingChannel = new window.WebSocket(_config2.default.webSocketUrl);
    this._signalingChannel.onopen = this.onSocketOpen.bind(this);
    this._signalingChannel.onmessage = this.onSocketMessage.bind(this);
  }

  onSocketOpen() {
    this._firstPeerCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._firstPeerCannel;
    this._lastPeerCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._lastPeerChannel;
    this._nodeCount = 0;
    this._requestTimeSend = Date.now();
    this.joinNetwork();
  }

  onSocketMessage(rawMessage) {
    const message = JSON.parse(rawMessage.data);
    this.handleMessage(message, this._currentCon, this._signalingChannel);
  }

  // Connect to to the first peer through the signaling server
  joinNetwork() {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        // Create data channel
        const dataChannel = _this._firstPeerCon.createDataChannel('First-Peer-Data-Channel');
        dataChannel.onmessage = function (message) {
          _this.handleMessage(JSON.parse(message.data), dataChannel);
        };
        _this._firstPeerChannel = dataChannel;
        dataChannel.onopen = function () {
          _this.timeJoinedNetwork = Date.now();
          console.log('Joined network!');
          _this.connectToLastPeer(dataChannel);
          // TODO: Initiate request
        };

        const offer = yield _this._firstPeerCon.createOffer();
        yield _this._firstPeerCon.setLocalDescription(offer);
        _this._firstPeerCon.onicecandidate = function (event) {
          if (event.candidate !== null) {
            // console.log('Candidate found')
            const msg = JSON.stringify({
              type: 'ice-candidate-for-peer-relay',
              payload: event.candidate,
              walkerId: _this._uuid
            });
            _this._signalingChannel.send(msg);
          }
        };
        const msg = JSON.stringify({
          type: 'walker-joining-offer',
          payload: _this._firstPeerCon.localDescription,
          walkerId: _this._uuid
        });
        _this._signalingChannel.send(msg);
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleMessage(message) {
    // console.log('---------------------------------')
    // console.log(JSON.stringify(message))
    switch (message.type) {
      case 'answer-for-walker':
        this._lastPeerCon.setRemoteDescription(new window.RTCSessionDescription(message.payload));
        break;
      case 'ice-candidate-for-walker':
        // console.log('ice-candidate-for-walker')
        this._lastPeerCon.addIceCandidate(new window.RTCIceCandidate(message.payload));
        break;
      case 'walker-joining-ice-candidate':
        // console.log('walker-joining-ice-candidate')
        this._firstPeerCon.addIceCandidate(new window.RTCIceCandidate(message.payload));
        break;
      case 'walker-joining-answer':
        this._firstPeerCon.setRemoteDescription(new window.RTCSessionDescription(message.payload));
        break;
      default:
      // console.log('Message type unknown')
      // console.log(JSON.stringify(message))
      // console.log('Type: ' + message.type)
      // console.log(message)
    }
  }

  // Creates a new PeerConnection on the _nextCon and sends an offer to _currentCon
  connectToLastPeer(channel) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      const con = new window.RTCPeerConnection(_config2.default.iceConfig);
      try {
        const dataChannel = con.createDataChannel('Last-Peer-Data-Channel');
        // Setup handlers for the locally created channel
        dataChannel.onmessage = function (message) {
          _this2.handleMessage(JSON.parse(message.data), con, dataChannel);
        };

        dataChannel.onopen = function (event) {
          // console.log(Date.now() - this.timeJoinedNetwork)
          console.log(`Connection to last peer took: ${Date.now() - _this2.timeJoinedNetwork} ms`);
        };
        con.onicecandidate = function (event) {
          if (event.candidate == null) {
            // TODO: send end of candidate event
          } else {
            if (event.candidate) {
              const jsonOffer = JSON.stringify({
                walkerId: _this2._uuid,
                type: 'ice-candidate-for-last-peer',
                payload: event.candidate,
                uuid: _this2._uuid
              });
              channel.send(jsonOffer);
            }
          }
        };
        // Create the offer for a p2p connection
        const offer = yield con.createOffer();
        yield con.setLocalDescription(offer);
        const jsonOffer = JSON.stringify({
          walkerId: _this2._uuid,
          type: 'offer-for-last-peer',
          payload: con.localDescription,
          uuid: _this2._uuid
        });
        _this2._lastPeerCon = con;

        console.log('Initiating request to connect with last peer');
        // console.log(JSON.stringify(jsonOffer))
        // console.log(channel)
        channel.send(jsonOffer);
        // console.log('Its sent!!')
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleDataChannels(peerConnection) {
    peerConnection.ondatachannel = event => {
      const channel = event.channel;

      channel.onmessage = msg => {
        const message = JSON.parse(msg.data);
        this.handleMessage(message, this._nextCon, channel);
      };

      channel.onopen = evt => {
        // this._currentCon = this._nextCon
        // this._nextCon = new window.RTCPeerConnection(config.iceConfig)
        this._nodeCount++;
        // console.log(this._requestTimeSend)
        console.log(`Connection established to node ${this._nodeCount}, took: ${JSON.stringify(Date.now() - this._requestTimeSend)} ms`);
        // console.log('Sending next request.')
        this._requestTimeSend = Date.now();
        // channel.send(JSON.stringify({
        //   type: 'get-offer-from-next-peer',
        //   walkerId: this._uuid
        // }))
      };
    };
  }

  /*
  -----------------------------------------------------------------------------------
  |
  | DICE Candidate Creation Functions
  |
  -----------------------------------------------------------------------------------
  */

  isHostIceCandidate(candidate) {
    return candidate.indexOf('host') > -1;
  }

  constructIceStringsFromLocalHostCandidate(candidate, ids) {
    // Get port number
    var port = this.findPortInCandidate(candidate);
    // console.log('Port is: ' + port)
    var ufrag = this.findUfragInCandidate(candidate);
    // console.log('Ufrag is: ' + ufrag)
    var ip = this.findLocalIpFromCandidate(candidate);
    // console.log('IP is: ' + ip)
    var candidateString = `${ids} ${port} typ srflx raddr ${ip} rport ${port} generation 0 ufrag ${ufrag} network-cost 50`;
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

  getIdStringsFromCandidate(candidate) {
    var startIndex = 0,
        index;
    var localIndex = index;
    for (var i = 0; i < 5; i++) {
      localIndex = candidate.indexOf(' ', localIndex + 1);
    }
    var substring = candidate.substring(index, localIndex);
    // console.log('Found string: ' + substring)
    return substring;
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