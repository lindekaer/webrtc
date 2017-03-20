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
  webSocketUrl: 'SIGNALING_URL',
  uuid: 'SIGNALING_UUID'
  // webSocketUrl: 'ws://192.168.1.242:8080/socketserver',
  // webSocketUrl: 'ws://174.138.65.125:8080/socketserver'
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
          this._nextCon.createAnswer(answer => {
            this._nextCon.setLocalDescription(answer);
          }, errorHandler);
        }, errorHandler);
        this._nextCon.onicecandidate = candidate => {
          // console.log('Got candidate event')
          if (candidate.candidate == null) {
            var answer = JSON.stringify({
              type: 'walker-to-middle',
              payload: this._nextCon.localDescription,
              walkerId: this._uuid
            });
            // console.log('Sending answer to node ' + this._nodeCount)
            // console.log('Sending answer back: ' + answer)
            channel.send(answer);
          }
        };
      };

      channel.onopen = evt => {
        console.log('On open');
        this._nodeCount++;
        // Log('Connection established to node ' + this._nodeCount)
        Log(`Connection established to node ${this._nodeCount}`);
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
