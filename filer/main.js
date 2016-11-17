const iceConfig = {
  iceServers: [
    { url: 'stun:23.21.150.121' }
  ]
}

let query = window.location.search
query = query.substring(1)
query = query.split('=')
const action = query[0]
const sdp = query[1]

if (action === 'offer') {
  receiveOffer(sdp, answer => {
    const sharingLinkBox = document.querySelector('#sharing-link')
    sharingLinkBox.innerHTML = answer
  })
}

// DOM elements
const fileUploader = document.querySelector('#file')
const sharingLinkBox = document.querySelector('#sharing-link')
const acceptanceBox = document.querySelector('#acceptance')
const acceptanceSubmit = document.querySelector('#acceptance-submit')

// Listen for file uploads
fileUploader.onchange = (event) => {
  // Get access to file
  const fileList = fileUploader.files
  const file = fileList[0]

  // Setup the connection for file transfer
  setupWebRtc(sharingLink => {
    sharingLinkBox.innerHTML = sharingLink
  })
}

function setupWebRtc (cb) {
  const peerConnection = new RTCPeerConnection(iceConfig)
  const dataChannel = peerConnection.createDataChannel('file-channel')

  // Setup handlers for the locally create channel
  handleDataChannel(dataChannel)

  // Config for a 'data-only' offer
  const mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
    }
  }

  acceptanceSubmit.onclick = (event) => {
    event.preventDefault()
    receiveAnswer(acceptanceBox.value)
  }

  // Create the offer for a p2p connection
  peerConnection.createOffer(handleOffer, function () {}, mediaConstraints)
  peerConnection.onicecandidate = function (candidate) {
    // When there are no more candidates...
    if (candidate.candidate == null) {
      // Print the offer in the DOM
      const base64EncodedOffer = window.btoa(JSON.stringify(peerConnection.localDescription))
      const url = window.location.pathname
      const sharingLink = url + '?offer=' + base64EncodedOffer
      cb(sharingLink)
    }
  }

  function handleDataChannel (channel) {
    // Log new messages
    channel.onmessage = function (msg) {
      console.log(msg.data)
    }
    // Other events
    channel.onerror = function (err) { console.log(err) }
    channel.onclose = function () { console.log('Closed!') }
    channel.onopen = function (evt) { console.log(channel); channel.send('DataChannel connection established. Welcome!') }
  }

  function handleOffer (offer) {
    // Set local description
    peerConnection.setLocalDescription(offer)
  }
}

function receiveOffer (data, cb) {
  const msg = window.atob(data)
  const sdp = JSON.parse(msg)
  const offer = new RTCSessionDescription(sdp)
  const peerConnection = new RTCPeerConnection(iceConfig)
  // handleDataChannels(peerConnection)
  peerConnection.onicecandidate = function (candidate) {
    if (candidate.candidate == null) {
      cb(JSON.stringify(peerConnection.localDescription))
    }
  }
  peerConnection.setRemoteDescription(offer, function () {
    peerConnection.createAnswer(function (answer) {
      peerConnection.setLocalDescription(answer)
    }, function (err) {})
  })
}

function receiveAnswer (data) {
  const sdp = JSON.parse(data)
  const answer = new RTCSessionDescription(sdp)
  peerConnection.setRemoteDescription(answer)
}
