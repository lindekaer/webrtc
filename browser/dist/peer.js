'use strict';

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           -----------------------------------------------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Version notes
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           -----------------------------------------------------------------------------------
                                                                                                                                                                                                                                                                                                                                                                                                                                                                           */
/*

*/

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

class Peer {
  constructor() {
    this._uuid = _uuid2.default.v1();
    this._connectionsAwaitingAnswer = {};
    this._walkerConnections = {};
    this.iceIdsForNextPeer = [];
    this.isLastPeer = true;
    this.connectToServer();
  }

  connectToServer() {
    console.log(_config2.default.webSocketUrl);
    this.signalingChannel = new window.WebSocket(_config2.default.webSocketUrl);
    this.signalingChannel.onopen = this.onSocketOpen.bind(this);
    this.signalingChannel.onmessage = this.onSocketMessage.bind(this);
  }

  onSocketOpen() {
    this.initialize();
  }

  onSocketMessage(message) {
    this.handleMessage(message.data, this.signalingChannel);
  }

  initialize() {
    this._entryCon = new window.RTCPeerConnection(_config2.default.iceConfig);
    this._extensionCon = new window.RTCPeerConnection(_config2.default.iceConfig);

    this._entryChannel;
    this._extensionChannel;

    this.setupPeerConnection(this._entryCon);
    this.setupPeerConnection(this._extensionCon);
    console.log('ConnectionState: ' + this._extensionCon.connectionState);
    this.joinNetwork();
  }

  setupPeerConnection(peerConnection) {
    peerConnection.ondatachannel = evt => {
      var channel = evt.channel;
      this._extensionChannel = channel;
      channel.onmessage = message => {
        this.handleMessage(message.data, channel);
      };
    };
  }

  joinNetwork() {
    var _this = this;

    return _asyncToGenerator(function* () {
      try {
        // Create data channel
        const dataChannel = _this._entryCon.createDataChannel('data-channel');
        dataChannel.onmessage = function (message) {
          _this.handleMessage(message.data, dataChannel);
        };
        dataChannel.onopen = function () {
          console.log('Joined network!');
        };
        _this._entryChannel = dataChannel;

        // Create the offer for a P2P connection
        const offer = yield _this._entryCon.createOffer();
        yield _this._entryCon.setLocalDescription(offer);
        _this._entryCon.onicecandidate = function (event) {
          if (event.candidate == null) {
            const msg = JSON.stringify({
              type: 'joining',
              payload: _this._entryCon.localDescription,
              joinerId: _this._uuid
            });
            _this.signalingChannel.send(msg);
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  createNewWalkerConnection(walkerId, requestingChannel, offer, isJoining) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      console.log('Start creating new PeerConnection for walker');
      try {
        const con = new window.RTCPeerConnection(_config2.default.iceConfig);
        console.log(con);
        yield con.setRemoteDescription(offer);
        const dataChannel = con.createDataChannel('data-channel');
        _this2._connectionsAwaitingAnswer[walkerId] = {
          connection: con,
          channel: dataChannel
        };
        // Setup handlers for the locally created channel
        dataChannel.onmessage = function (message) {
          _this2.handleMessage(message.data, dataChannel);
        };

        dataChannel.onopen = function (event) {
          console.log('Connection opened to walker with id ' + walkerId);
          _this2._walkerConnections[[walkerId]] = {
            connection: con,
            channel: dataChannel
          };
          delete _this2._connectionsAwaitingAnswer[[walkerId]];
        };
        var answer = yield con.createAnswer();
        yield con.setLocalDescription(answer);
        const jsonAnswer = JSON.stringify({
          walkerId,
          type: isJoining ? 'walker-joining-answer' : 'answer-for-walker',
          payload: con.localDescription,
          uuid: _this2._uuid
        });
        requestingChannel.send(jsonAnswer);
        con.onicecandidate = function (event) {
          if (event.candidate == null) {
            // TODO: send end of candidate event
          } else {
            if (event.candidate) {
              const jsonICE = JSON.stringify({
                walkerId,
                type: isJoining ? 'walker-joining-ice-candidate' : 'ice-candidate-for-walker',
                payload: event.candidate,
                uuid: _this2._uuid
              });
              requestingChannel.send(jsonICE);
            }
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  addIceCandidateForWalkerConnection(candidate, walkerId) {
    this._connectionsAwaitingAnswer[walkerId].connection.addIceCandidate(candidate);
  }

  connectToWalker(answer, walkerId) {
    console.log('Answer from walker: ' + JSON.stringify(answer));
    this._connectionsAwaitingAnswer[[walkerId]].connection.setRemoteDescription(answer);
  }

  handleAnswerFromLastPeer(answer) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      _this3._entryCon.setRemoteDescription(new window.RTCSessionDescription(answer));
    })();
  }

  sendAnswerToJoiningPeer(message) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const offer = new window.RTCSessionDescription(message.payload);
      _this4.iceIdsForNextPeer = _this4.getIdStringsFromOffer(JSON.stringify(message.payload.sdp));
      yield _this4._extensionCon.setRemoteDescription(offer);
      _this4._extensionCon.onicecandidate = function (event) {
        if (event.candidate == null) {
          var answer = JSON.stringify({
            type: 'answer-for-joining',
            payload: _this4._extensionCon.localDescription,
            joinerId: message.joinerId
          });
          _this4.signalingChannel.send(answer);
        }
      };
      _this4._extensionCon.ondatachannel = function (evt) {
        console.log('Connected to next peer');
        _this4.isLastPeer = false;
        const channel = evt.channel;
        _this4._extensionChannel = channel;
        channel.onmessage = function (message) {
          _this4.handleMessage(message.data, channel);
        };
      };

      const answer = yield _this4._extensionCon.createAnswer();
      _this4._extensionCon.setLocalDescription(answer);
    })();
  }

  handleMessage(channelMessage, channel) {
    console.log('Message: ' + channelMessage);
    var message = JSON.parse(channelMessage);
    switch (message.type) {
      case 'walker-joining-offer':
        this.createNewWalkerConnection(message.walkerId, channel, message.payload, true);
        break;
      // case 'answer-from-walker-relay':
      //   this._extensionChannel.send(JSON.stringify({
      //     type: 'answer-from-walker-destination',
      //     data: message.payload,
      //     walkerId: message.walkerId
      //   }))
      //   break
      // case 'answer-from-walker-destination':
      //   var answer = new window.RTCSessionDescription(message.data)
      //   this.connectToWalker(answer, message.walkerId)
      //   break
      case 'offer-for-last-peer':
        if (this.isLastPeer) {
          this.createNewWalkerConnection(message.walkerId, channel, message.payload);
        } else {
          this._extensionChannel.send(JSON.stringify(message));
        }
        break;
      // case 'request-offer-for-walker':
      //   this.createNewWalkerConnection(message.walkerId, channel)
      //   break
      case 'offer-from-walker':
        var walker = this._walkerConnections[[message.walkerId]];
        if (walker) {
          walker.channel.send(JSON.stringify(message));
        } else {
          this._entryChannel.send(JSON.stringify(message));
        }
        // this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify({
        //   payload: message.payload,
        //   iceIds: this.iceIdsForNextPeer
        // }))
        break;
      case 'ice-candidate-for-walker':
        var walker = this._walkerConnections[[message.walkerId]];
        if (walker) {
          walker.channel.send(JSON.stringify(message));
        } else {
          this._entryChannel.send(JSON.stringify(message));
        }
        // this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify(message))
        break;
      case 'ice-candidate-for-last-peer':
        if (this.isLastPeer) {
          var candidate = new window.RTCIceCandidate(message.payload);
          this.addIceCandidateForWalkerConnection(candidate, message.walkerId);
        } else {
          this._extensionChannel.send(JSON.stringify(message));
        }
        break;
      case 'ice-candidate-for-peer':
        var candidate = new window.RTCIceCandidate(message.payload);
        this.addIceCandidateForWalkerConnection(candidate, message.walkerId);
        break;
      case 'joining':
        this.sendAnswerToJoiningPeer(message);
        break;
      case 'answer-for-joining':
        this.handleAnswerFromLastPeer(message.payload);
        break;
      default:
        console.log(`No case for type: ${ message.type }`);
    }
  }

  getIdStringsFromOffer(offer) {
    var startIndex = 0;
    var index;
    var strings = [];
    while ((index = offer.indexOf('candidate:', startIndex)) > -1) {
      var localIndex = index;
      for (var i = 0; i < 5; i++) {
        localIndex = offer.indexOf(' ', localIndex + 1);
      }
      var substring = offer.substring(index, localIndex);
      strings.push(substring);
      startIndex = index + 'candidate:'.length;
    }
    return strings;
  }

}

const newPeer = new Peer();
console.log('My ID is: ' + newPeer._uuid);