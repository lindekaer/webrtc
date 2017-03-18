(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  iceConfig: {
    iceServers: [{
      urls: ['stun:stun.I.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302']
    }]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },
  // webSocketUrl: 'SIGNALING_URL',
  uuid: 'SIGNALING_UUID',
  webSocketUrl: 'ws://174.138.65.125:8080/socketserver'
  // webSocketUrl: 'ws://192.168.1.242:8080/socketserver',
  // uuid: Math.random() > 0.5 ? 'meep' : 'beans'
};
},{}],2:[function(require,module,exports){
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
    console.log('Socket message');
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
        _this2._connectionsAwaitingAnswer[walkerId] = {
          connection: con
        };
        console.log(con);
        con.ondatachannel = function (event) {
          console.log('Datachannel created');
          var dataChannel = event.channel;
          _this2._connectionsAwaitingAnswer[walkerId]['channel'] = dataChannel;
          dataChannel.onmessage = function (message) {
            console.log('handleMessage now');
            _this2.handleMessage(message.data, dataChannel);
          };

          dataChannel.onopen = function (evt) {
            console.log('Connection opened to walker with id ' + walkerId);
            _this2._walkerConnections[[walkerId]] = {
              connection: con,
              channel: dataChannel
            };
            delete _this2._connectionsAwaitingAnswer[[walkerId]];
          };
        };

        yield con.setRemoteDescription(offer);
        // Setup handlers for the locally created channel
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
        var answer = yield con.createAnswer();
        yield con.setLocalDescription(answer);
        const jsonAnswer = JSON.stringify({
          walkerId,
          type: isJoining ? 'walker-joining-answer' : 'answer-for-walker',
          payload: con.localDescription,
          uuid: _this2._uuid
        });
        requestingChannel.send(jsonAnswer);
      } catch (err) {
        console.log(err);
      }
    })();
  }

  addIceCandidateForWalkerConnection(candidate, walkerId) {
    // console.log('Candidate: ' + JSON.stringify(candidate))
    // console.log(walkerId)
    // console.log('-->')
    // console.log(JSON.stringify(this))
    // console.log('-->')
    // console.log(this._connectionsAwaitingAnswer[walkerId])
    var con = this._connectionsAwaitingAnswer[walkerId];
    if (con) {
      con.connection.addIceCandidate(candidate);
    } else {
      console.log('NOOOO could not add ice candidate');
    }
    // this._connectionsAwaitingAnswer[walkerId].connection.addIceCandidate(candidate)
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
    console.log(channelMessage);
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
          console.log('Last peer creating walker connection');
          this.createNewWalkerConnection(message.walkerId, channel, message.payload);
        } else {
          console.log('Not last peer sending it on');
          this._extensionChannel.send(JSON.stringify(message));
        }
        break;
      case 'answer-for-walker':
        var walker = this._walkerConnections[[message.walkerId]];
        if (walker) {
          walker.channel.send(JSON.stringify(message));
        } else {
          this._entryChannel.send(JSON.stringify(message));
        }
        break;
      // case 'offer-from-walker':
      //   var walker = this._walkerConnections[[message.walkerId]]
      //   if (walker) {
      //     walker.channel.send(JSON.stringify(message))
      //   } else {
      //     this._entryChannel.send(JSON.stringify(message))
      //   }
      // this._walkerConnections[[message.walkerId]].channel.send(JSON.stringify({
      //   payload: message.payload,
      //   iceIds: this.iceIdsForNextPeer
      // }))
      // break
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
          console.log('Last peer adding candidate');
          var candidate = new window.RTCIceCandidate(message.payload);
          this.addIceCandidateForWalkerConnection(candidate, message.walkerId);
        } else {
          console.log('Not last peer sending it on');
          this._extensionChannel.send(JSON.stringify(message));
        }
        break;
      case 'ice-candidate-for-peer':
        console.log('ice candidate for peer');
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
        console.log(`No case for type: ${message.type}`);
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
},{"./config":1,"uuid":3}],3:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":6,"./v4":7}],4:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],5:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":4,"./lib/rng":5}],7:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":4,"./lib/rng":5}]},{},[2]);
