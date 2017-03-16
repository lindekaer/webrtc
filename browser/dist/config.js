'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  iceConfig: {
    iceServers: [{
      urls: ['stun:stun.I.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302']
    }, {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    }]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },
  webSocketUrl: 'ws://192.168.1.242:9000/socketserver', //'ws://localhost:9000/socketserver',
  uuid: Math.random() > 0.5 ? 'meep' : 'beans',
  useTrickleIce: true
};
// 'ws://178.62.51.86:9000/socketserver'