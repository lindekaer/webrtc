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
    // console.log(JSON.stringify(message))
    // console.log('message: ' + JSON.stringify(message.data))
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
      peerConnection.addIceCandidate(new window.RTCIceCandidate(message));
    }
  }

  consume(rawMessage) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        const message = JSON.parse(rawMessage);
        _this.handleMessage(message, _this._currentCon, _this._socket);
        // if (data.sdp) {
        //   const offer = new window.RTCSessionDescription(data)
        //   this.handleDataChannels(this._currentCon)
        //   this._currentCon.setRemoteDescription(offer, () => {
        //     this._currentCon.onicecandidate = (event) => {
        //       if (event.candidate == null) {
        //         // TODO: Send end of candidates event
        //       } else {
        //         if (event.candidate) {
        //           const jsonOffer = JSON.stringify({
        //             type: 'ice-candidate-for-peer-relay',
        //             payload: event.candidate,
        //             uuid: this._uuid
        //           })
        //           this._socket.send(jsonOffer)
        //         }
        //       }
        //     } 
        //     this._currentCon.createAnswer((answer) => {
        //       this._currentCon.setLocalDescription(answer)
        //       var stringAnswer = JSON.stringify({
        //         type: 'answer-from-walker-relay',
        //         payload: this._currentCon.localDescription,
        //         walkerId: this._uuid
        //       })
        //       this._socket.send(stringAnswer)
        //     }, errorHandler)
        //   }, errorHandler)
        // } else {
        //   this._currentCon.addIceCandidate(new window.RTCIceCandidate(data))
        // }
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