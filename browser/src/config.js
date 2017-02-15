export default {
  iceConfig: {
    iceServers: [
      { 
       urls: [
         'stun:stun.I.google.com:19302',
         'stun:stun1.l.google.com:19302',
         'stun:stun2.l.google.com:19302',
         'stun:stun3.l.google.com:19302',
         'stun:stun4.l.google.com:19302'
       ]      },
      {
        urls: 'turn:numb.viagenie.ca',
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
