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
        ]
      }
    ]
  },

  mediaConstraints: {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  },
  webSocketUrl: 'SIGNALING_URL',
  uuid: 'SIGNALING_UUID'
  // webSocketUrl: 'ws://174.138.65.125:8080/socketserver',
  // webSocketUrl: 'ws://192.168.8.101:8080/socketserver',
  // uuid: Math.random() > 0.5 ? 'meep' : 'beans'
}
