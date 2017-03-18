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
  // uuid: 'SIGNALING_UUID'
  // webSocketUrl: 'ws://174.138.65.125:8080/socketserver'
  webSocketUrl: 'ws://192.168.1.242:8080/socketserver',
  uuid: Math.random() > 0.5 ? 'meep' : 'beans'
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
