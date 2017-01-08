export default {
  iceConfig: {
    iceServers: [
       { url: 'stun:stun.I.google.com:19302' }
    ]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },

  webSocketUrl: 'ws://localhost:8080/socketserver'
}
