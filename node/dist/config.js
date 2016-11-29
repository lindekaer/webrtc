'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  iceConfig: {
    iceServers: [{ url: 'stun:23.21.150.121' }]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },

  webSocketUrl: 'ws://localhost:8080/socketserver'
};