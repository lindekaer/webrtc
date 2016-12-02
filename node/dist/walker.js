'use strict';

var _wrtc = require('wrtc');

var _wrtc2 = _interopRequireDefault(_wrtc);

var _uws = require('uws');

var _uws2 = _interopRequireDefault(_uws);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

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

/*
-----------------------------------------------------------------------------------
|
| Peer class
|
-----------------------------------------------------------------------------------
*/

class WalkerPeer {
  constructor() {
    this._uuid = _nodeUuid2.default.v1();
    this.connectToServer();
  }

  connectToServer() {
    this._socket = new _uws2.default(_config2.default.webSocketUrl);
    this._socket.on('open', this.onSocketOpen.bind(this));
    this._socket.on('message', this.onSocketMessage.bind(this));
  }

  onSocketOpen() {
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    });
    this._socket.send(msg);
    this.init();
  }

  onSocketMessage(message) {
    this.consume(message);
  }

  init() {
    this._currentCon = new _wrtc2.default.RTCPeerConnection(_config2.default.iceConfig);
    this._nextCon;
    this._nodeCount = 0;
  }

  consume(rawMessage) {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        const message = JSON.parse(rawMessage);
        const offer = new _wrtc2.default.RTCSessionDescription(message);
        _this.handleDataChannels(_this._currentCon);
        yield _this._currentCon.setRemoteDescription(offer);
        const answer = yield _this._currentCon.createAnswer();
        _this._currentCon.setLocalDescription(answer);
        _this._currentCon.onicecandidate = function (candidate) {
          if (candidate.candidate == null) {
            _this._socket.send(JSON.stringify({
              type: 'walker-request-answer',
              payload: _this._currentCon.localDescription
            }));
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleDataChannels(peerConnection) {
    peerConnection.ondatachannel = function (event) {
      const channel = event.channel;
      channel.onmessage = function (msg) {
        const data = JSON.parse(msg);
        const offer = new _wrtc2.default.RTCSessionDescription(data.payload);
        this._currentCon = this._nextCon;
        this._nextCon = new _wrtc2.default.RTCPeerConnection(_config2.default.iceConfig);
        this.handleDataChannels(this._nextCon);
        this._nextCon.onicecandidate = function (candidate) {
          if (candidate.candidate == null) {
            channel.send(JSON.stringify({ type: 'walker-to-middle', payload: this._nextCon.localDescription }));
          }
        };
        this._nextCon.setRemoteDescription(offer, function () {
          this._nextCon.createAnswer(function (answer) {
            this._nextCon.setLocalDescription(answer);
          }, function (err) {});
        });
      };

      channel.onerror = function (err) {
        console.log(err);
      };
      channel.onclose = function () {
        console.log('Closed!');
      };
      channel.onopen = function (evt) {
        this._nodeCount++;
        console.log('Connection established to node ' + this._nodeCount + ' @ ' + Date.now());
        channel.send(JSON.stringify({ type: 'sendWaiting' }));
      };
    };
  }
}

const newPeer = new WalkerPeer();
console.log('I am a walker and my ID is: ' + newPeer._uuid);

// Peer.init = function () {

// Peer.handleMessage = function (message, channel) {
//   console.log(message)
//   switch (message.type) {
//     case 'waiting':
//       console.log('waiting')
//       this._waitingOffer = JSON.stringify(message.data)
//       break
//     case 'walkerToMiddle':
//       this._initializedChannel.send(JSON.stringify({
//         type: 'middleToNext',
//         data: message.data
//       }))
//       console.log('walkerToMiddle')
//       break
//     case 'middleToNext':
//       var answer = new RTCSessionDescription(message.data)
//       this._readyCon.setRemoteDescription(answer)
//       console.log('middleToNext')
//       break
//     case 'sendWaiting':
//       console.log('sendWaiting')
//       channel.send(this._waitingOffer)
//       break
//     default: console.log('No type: ')
//   }
// }

// Peer.setupReadyCon = function () {
//   var dataChannelReady = this._readyCon.createDataChannel('ready-channel')
//   // Setup handlers for the locally create channel
//   this.handleChannel(dataChannelReady)
//   // Config for a 'data-only' offer
//   var readyChannel = dataChannelReady
//   // Create the offer for a p2p connection
//   this._readyCon.createOffer(this.handleOfferReady.bind(this), function () {}, mediaConstraints)
//   this._readyCon.onicecandidate = this.handlerOnIceCandidate.bind(this)
// }


// Peer.addDomEventHandlers = function () {
//   // DOM elements
//   var generateBtn = document.querySelector('#generate-offer')
//   var consumeBtn = document.querySelector('#consume-sdp')
//   var sdp = document.querySelector('#sdp')
//   var walkerBtn = document.querySelector('#consume-walker-offer')
//   var showWalkerOffer = document.querySelector('#show-walker-offer')

//   var self = this

//   showWalkerOffer.addEventListener('click', function () {
//     self.printSdp(JSON.parse(self._readyOffer))
//   })

//   walkerBtn.addEventListener('click', function () {
//     var data = JSON.parse(sdp.value)
//     var answer = new RTCSessionDescription(data)
//     self._readyCon.setRemoteDescription(answer)
//   })

//   // Listener for comsune buttom
//   consumeBtn.addEventListener('click', function () {
//     self.consume.bind(self, sdp.value)
//   })
// }

// Peer.handleOfferInit = function (offer) {
//   // Set local description
//   this._initializedCon.setLocalDescription(offer)
// }

// Peer.handleOfferReady = function (offer) {
//   // Set local description
//   this._readyCon.setLocalDescription(offer)
// }

// Peer.printSdp = function (sdp) {
//   // Print it to the DOM
//   var generatedOffer = document.querySelector('#generated-content')
//   generatedOffer.innerHTML = JSON.stringify(sdp, null, 2)
//   // Send it to the server

//   var msg = {
//     data: sdp,
//     type: 'offer',
//     uuid: this._uuid
//   }
//   this._socket.send(JSON.stringify(msg, null, 2))
// }

// Peer.consume = function (data, offererUuid) {
//   var json = new RTCSessionDescription(data)
//   if (json.type === 'offer') {
//     // the data is an offer and will be set up on recievingCon
//     var offer = new RTCSessionDescription(data)
//     var self = this
//     self._recievedCon.onicecandidate = function (candidate) {
//       if (candidate.candidate == null) {
//         self.printSdp(self._recievedCon.localDescription)
//       }
//     }
//     self._recievedCon.setRemoteDescription(offer, function () {
//       self._recievedCon.createAnswer(function (answer) {
//         self._recievedCon.setLocalDescription(answer)
//         self._socket.send(JSON.stringify({
//           type: 'answer',
//           payload: answer,
//           uuid: offererUuid
//         }))
//       }, function (err) {})
//     })
//   } else if (json.type === 'answer') {
//     // the data is an answer and will be set up on initializedCon
//     var answer = new RTCSessionDescription(data)
//     self._initializedCon.setRemoteDescription(answer)
//     // After this, the connection is established...
//   }
// }

// Peer.handlerOnIceCandidate = function (candidate) {
//   // When there are no more candidates...
//   if (candidate.candidate == null) {
//     // Print the offer in the DOM
//     // console.log('Ready-offer: ', readyCon.localDescription)
//     this._readyOffer = JSON.stringify({
//       type: 'waiting',
//       data: this._readyCon.localDescription
//     })
//   }
// }

// /*
// -----------------------------------------------------------------------------------
// |
// | Utils
// |
// -----------------------------------------------------------------------------------
// */

// function generateUuid () {
//   var d = new Date().getTime()
//   if (window.performance && typeof window.performance.now === 'function') {
//     d += window.performance.now() // use high-precision timer if available
//   }
//   var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
//     var r = (d + Math.random() * 16) % 16 | 0
//     d = Math.floor(d / 16)
//     return (c === 'x' ? r : (r&0x3 | 0x8)).toString(16)
//   })
//   return uuid
// }

// /*
// -----------------------------------------------------------------------------------
// |
// | Bootstrap application
// |
// -----------------------------------------------------------------------------------
// */

// Peer.start()