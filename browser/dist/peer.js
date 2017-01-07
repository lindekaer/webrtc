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


/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class Peer {
  constructor() {
    this._uuid = _uuid2.default.v1();
    this.connectToServer();
  }

  connectToServer() {
    console.log(_config2.default.webSocketUrl);
    this._socket = new window.WebSocket(_config2.default.webSocketUrl);
    this._socket.onopen = this.onSocketOpen.bind(this);
    this._socket.onmessage = this.onSocketMessage.bind(this);
  }

  onSocketOpen() {
    console.log('opening connection');
    // const msg = JSON.stringify({
    //   type: 'joining',
    //   uuid: this._uuid
    // })
    // this._socket.send(msg)
    this.init();
  }

  onSocketMessage(message) {
    console.log('Got from socket: ', message);
    const msg = JSON.parse(message.data);
    if (msg.type === 'offer') {
      this.consume('offer', msg.payload, msg.uuid);
    }
    if (msg.type === 'answer') {
      this.consume('answer', msg.payload);
    }
    if (msg.type === 'walker-request') {
      console.log('got walker request');
      this._socket.send(this._readyOffer);
    }
    if (msg.type === 'walker-request-answer') {
      this.connectWalker(msg.payload);
    }
  }

  init() {
    this._initializedCon = new RTCPeerConnection(_config2.default.iceConfig);
    this._recievedCon = new RTCPeerConnection(_config2.default.iceConfig);
    this._readyCon = new RTCPeerConnection(_config2.default.iceConfig);

    this._initializedChannel;
    this._recievedChannel;
    this._readyChannel;

    this._readyOffer;

    this.setupPeerConnection(this._initializedCon);
    this.setupPeerConnection(this._recievedCon);
    this.setupPeerConnection(this._readyCon);
    this.setupReadyCon();
    this.createOffer();
  }

  setupPeerConnection(peerConnection) {
    peerConnection.ondatachannel = evt => {
      var channel = evt.channel;
      this._recievedChannel = channel;
      channel.onopen = () => {
        channel.send(this._readyOffer);
      };
      channel.onmessage = message => {
        this.handleChannelMessage(message);
      };
    };
  }

  setupReadyCon() {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        const dataChannelReady = _this._readyCon.createDataChannel('ready-data-channel');
        // Setup handlers for the locally created channel
        dataChannelReady.onmessage = function (message) {
          _this.handleChannelMessage(message, dataChannelReady);
        };
        // Config for a 'data-only' offer
        _this._readyChannel = dataChannelReady;
        // Create the offer for a p2p connection
        const offer = yield _this._readyCon.createOffer();
        yield _this._readyCon.setLocalDescription(offer);
        _this._readyCon.onicecandidate = function (candidate) {
          if (candidate.candidate == null) {
            _this._readyOffer = JSON.stringify({
              type: 'walker-request-offer',
              payload: _this._readyCon.localDescription,
              uuid: _this._uuid
            });
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  connectWalker(sdp) {
    this._readyCon.setRemoteDescription(sdp);
  }

  createOffer() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      try {
        // Create data channel
        const dataChannel = _this2._initializedCon.createDataChannel('data-channel');
        dataChannel.onmessage = function (message) {
          _this2.handleChannelMessage(message, dataChannel);
        };
        _this2._initializedChannel = dataChannel;

        // Create the offer for a P2P connection
        const offer = yield _this2._initializedCon.createOffer();
        yield _this2._initializedCon.setLocalDescription(offer);
        _this2._initializedCon.onicecandidate = function (candidate) {
          if (candidate.candidate == null) {
            const msg = JSON.stringify({
              type: 'joining',
              payload: _this2._initializedCon.localDescription,
              uuid: _this2._uuid
            });
            _this2._socket.send(msg);
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  consume(type, sdp, inputUuid) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      try {
        if (type === 'offer') {
          const offer = new RTCSessionDescription(sdp);
          yield _this3._recievedCon.setRemoteDescription(offer);
          const answer = yield _this3._recievedCon.createAnswer();
          _this3._recievedCon.setLocalDescription(answer);
          _this3._recievedCon.onicecandidate = function (candidate) {
            if (candidate.candidate == null) {
              _this3._socket.send(JSON.stringify({
                type: 'answer',
                payload: _this3._recievedCon.localDescription,
                uuid: inputUuid
              }));
            }
          };
        } else if (type === 'answer') {
          const answer = new RTCSessionDescription(sdp);
          _this3._initializedCon.setRemoteDescription(answer);
          console.log('initilizedCon has been set.');
        }
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleChannelMessage(channelMessage, channel) {
    const channelMessageData = channelMessage.data;
    var message = JSON.parse(channelMessageData);
    switch (message.type) {
      case 'walker-request-offer':
        console.log('waiting');
        this._waitingOffer = JSON.stringify(message.payload);
        break;
      case 'walker-to-middle':
        this._initializedChannel.send(JSON.stringify({
          type: 'middle-to-next',
          data: message.payload
        }));
        break;
      case 'middle-to-next':
        var answer = new RTCSessionDescription(message.data);
        this._readyCon.setRemoteDescription(answer);
        console.log('middleToNext');
        break;
      case 'send-waiting':
        console.log('sendWaiting');
        channel.send(this._waitingOffer);
        break;
      case 'chat':
        console.log(`FROM (${ message.uuid }): ${ message.payload }`);
        break;
      default:
        console.log(`No case for type: ${ message.type }`);
    }
  }
}

const newPeer = new Peer();
console.log('My ID is: ' + newPeer._uuid);