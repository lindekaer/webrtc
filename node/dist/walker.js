'use strict';

var _wrtc = require('wrtc');

var _wrtc2 = _interopRequireDefault(_wrtc);

var _uws = require('uws');

var _uws2 = _interopRequireDefault(_uws);

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
    peerConnection.ondatachannel = event => {
      const channel = event.channel;
      channel.onmessage = msg => {
        const data = JSON.parse(msg.data);
        const offer = new _wrtc2.default.RTCSessionDescription(data);
        this._currentCon = this._nextCon;
        this._nextCon = new _wrtc2.default.RTCPeerConnection(_config2.default.iceConfig);
        this.handleDataChannels(this._nextCon);

        this._nextCon.setRemoteDescription(offer, () => {
          this._nextCon.createAnswer(answer => {
            this._nextCon.setLocalDescription(answer);
          }, errorHandler);
        }, errorHandler);
        this._nextCon.onicecandidate = candidate => {
          if (candidate.candidate == null) {
            channel.send(JSON.stringify({ type: 'walker-to-middle', payload: this._nextCon.localDescription }));
          }
        };
      };

      channel.onopen = evt => {
        this._nodeCount++;
        console.log('Walker channel has opened');
        console.log('Connection established to node ' + this._nodeCount + ' @ ' + Date.now());
        channel.send(JSON.stringify({ type: 'send-waiting' }));
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