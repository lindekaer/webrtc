export default {
  iceConfig: {
    iceServers: [
       { urls: 'stun:stun.I.google.com:19302' }
       
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
}
