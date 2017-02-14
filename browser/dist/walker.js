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

  onSocketMessage(message) {
    console.log(JSON.stringify(message));
    console.log('message: ' + JSON.stringify(message.data));
    this.consume(message.data);
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

  consume(rawMessage) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        const message = JSON.parse(rawMessage);
        const offer = new window.RTCSessionDescription(message);
        _this.handleDataChannels(_this._currentCon);
        _this._currentCon.onicecandidate = function (event) {
          if (event.candidate == null) {
            _this._socket.send(JSON.stringify({
              type: 'answer-from-walker',
              payload: _this._currentCon.localDescription,
              walkerId: _this._uuid
            }));
          }
        };
        yield _this._currentCon.setRemoteDescription(offer);
        const answer = yield _this._currentCon.createAnswer();
        _this._currentCon.setLocalDescription(answer);
      } catch (err) {
        console.log(err);
      }
    })();
  }
  // 'walker-request-answer'
  handleDataChannels(peerConnection) {
    peerConnection.ondatachannel = event => {
      const channel = event.channel;
      channel.onmessage = msg => {
        const data = JSON.parse(msg.data);
        if (data.sdp) {
          console.log('Offer: ');
          console.log(JSON.stringify(data));
          const offer = new window.RTCSessionDescription(data);
          this.handleDataChannels(this._nextCon);
          this._nextCon.setRemoteDescription(offer, () => {
            this._nextCon.createAnswer(answer => {
              this._nextCon.setLocalDescription(answer);
              channel.send(JSON.stringify({
                type: 'answer-from-walker-relay',
                payload: this._nextCon.localDescription,
                walkerId: this._uuid
              }));
            }, errorHandler);
          }, errorHandler);
        } else {
          // console.log('Adding ice candidate')
          // console.log('should be ice: ')
          // console.log(JSON.stringify(data))
          console.log('Candidate: ');
          console.log(JSON.stringify(data));
          this._nextCon.addIceCandidate(new window.RTCIceCandidate(data));
        }
      };

      channel.onopen = evt => {
        this._currentCon = this._nextCon;
        this._nextCon = new window.RTCPeerConnection(_config2.default.iceConfig);
        this._nextCon.onicecandidate = event => {
          if (event.candidate == null) {
            // channel.send(JSON.stringify({
            //   type: 'answer-from-walker-relay',
            //   payload: this._nextCon.localDescription,
            //   walkerId: this._uuid
            // }))
          }
        };
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