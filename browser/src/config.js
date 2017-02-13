export default {
  iceConfig: {
    iceServers: [
      { 
        url: 'stun:stun.I.google.com:19302' 
      },
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com'
      }
    ]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },

  webSocketUrl: 'ws://178.62.51.86:8080/socketserver'//ws://localhost:8080/socketserver'
}
