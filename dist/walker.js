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


const Log = msg => {
  const data = Date.now() + ' - ' + msg;
  console.log(data);
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
    this._requestTimeSend = Date.now();
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
    // console.log('Got message from socket: ' + message.data)
    this.consume(message.data);
  }

  init() {
    this._currentCon = new RTCPeerConnection(_config2.default.iceConfig);
    this._nextCon = new RTCPeerConnection(_config2.default.iceConfig);
    this._currentChannel;
    this._nextChannel;
    this._nodeCount = 0;
    const msg = JSON.stringify({
      type: 'walker-request',
      uuid: this._uuid
    });
    this._socket.send(msg);
    this._requestTimeSend = Date.now();
  }

  consume(rawMessage) {
    var _this = this;

    return _asyncToGenerator(function* () {
      // console.log('Consuming')
      try {
        const message = JSON.parse(rawMessage);
        const offer = new RTCSessionDescription(message);
        _this.handleDataChannels(_this._nextCon);
        yield _this._nextCon.setRemoteDescription(offer);
        const answer = yield _this._nextCon.createAnswer();
        _this._nextCon.setLocalDescription(answer);
        _this._nextCon.onicecandidate = function (candidate) {
          if (candidate.candidate == null) {
            var answer = JSON.stringify({
              type: 'walker-request-answer',
              payload: _this._nextCon.localDescription,
              walkerId: _this._uuid
            });
            _this._socket.send(answer);
            // console.log('Sending answer back: ' + answer)
          }
        };
      } catch (err) {
        console.log(err);
      }
    })();
  }

  handleDataChannels(peerConnection) {
    peerConnection.onconnectionstatechange = event => {
      console.log('state ' + JSON.stringify(event));
      console.log('Connection state changed to: ' + peerConnection.connectionState);
    };
    peerConnection.oniceconnectionstatechange = event => {
      // console.log('ICE state ' + JSON.stringify(event))
      console.log('ICE connection state changed to: ' + peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'connected') {
        this._timeConnectingPeer = Date.now() - this._timeInitEF;
      }
    };
    peerConnection.ondatachannel = event => {
      const channel = event.channel;
      this._nextChannel = channel;
      console.log('On data channel');
      channel.onmessage = msg => {
        console.log('On message');
        // console.log('Recieved offer from node ' + this._nodeCount)
        const data = JSON.parse(msg.data);
        const offer = new RTCSessionDescription(data);
        this._currentCon = this._nextCon;
        this._nextCon = new RTCPeerConnection(_config2.default.iceConfig);
        this.handleDataChannels(this._nextCon);

        this._nextCon.setRemoteDescription(offer, () => {
          this._timeIceGatheringStart = Date.now();
          this._nextCon.createAnswer(answer => {
            this._nextCon.setLocalDescription(answer);
          }, errorHandler);
        }, errorHandler);
        this._nextCon.onicecandidate = candidate => {
          // console.log('Got candidate event')
          if (candidate.candidate == null) {
            this._timeIceGathering = Date.now() - this._timeIceGatheringStart;
            var answer = JSON.stringify({
              type: 'walker-to-middle',
              payload: this._nextCon.localDescription,
              walkerId: this._uuid
            });
            // console.log('Sending answer to node ' + this._nodeCount)
            // console.log('Sending answer back: ' + answer)
            channel.send(answer);
          } else {
            this._timeHostCandidate = Date.now() - this._timeIceGatheringStart;
          }
        };
      };

      channel.onopen = evt => {
        console.log('On open');
        this._nodeCount++;
        // Log('Connection established to node ' + this._nodeCount)
        // Log(`##LOG## Connection established to node ${this._nodeCount}, iceTime: ${this._timeIceGathering}`)
        console.log(`### LOG ###${Date.now()},${this._timeHostCandidate},${this._timeIceGathering},${this._timeConnectingPeer}`);
        this._timeInitEF = Date.now();
        channel.send(JSON.stringify({
          type: 'get-offer-from-next-peer',
          walkerId: this._uuid
        }));
        if (this._currentChannel) {
          console.log('Closing connection');
          this._currentChannel.send(JSON.stringify({ type: 'close' }));
        }
        this._currentCon.close();
        // channel.close()
        this._currentCon = this._nextCon;
        this._currentChannel = this._nextChannel;
        this._requestTimeSend = Date.now();
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