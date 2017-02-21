
#Links
[Description of sdp](https://webrtchacks.com/sdp-anatomy/)

## DICE Links
https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/
http://computer.howstuffworks.com/nat.htm
https://en.wikipedia.org/wiki/STUN
https://tools.ietf.org/pdf/draft-nandakumar-rtcweb-sdp-08.pdf -> page 10
https://tools.ietf.org/pdf/rfc3264.pdf -> page 14
https://tools.ietf.org/pdf/rfc2327.pdf -> page 9
https://en.wikipedia.org/wiki/Interactive_Connectivity_Establishment
https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-03#section-3.4.1 -> page 10
https://tools.ietf.org/pdf/rfc5245.pdf -> page 98
https://webrtchacks.com/sdp-anatomy/
https://gist.github.com/yetithefoot/7592580 -> list of stun and turn
https://webrtchacks.com/trickle-ice/
https://developer.mozilla.org/en-US/docs/Web/API/RTCIceServer
https://www.w3.org/TR/webrtc/ -> search for addIceCandidate
https://www.w3.org/TR/webrtc/#dom-rtcicecandidate-sdpmlineindex -> search for 'This carries the candidate-attribute as defined in section 15.1 of [ICE].'
https://tools.ietf.org/html/rfc5245#page-73 -> page 73
http://stackoverflow.com/questions/26342589/how-does-webrtc-decide-which-turn-servers-to-use
https://tools.ietf.org/html/rfc5245#section-4.1.2 -> page 22
https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection#RTCPeerConnectionState_enum -> search for  'RTCPeerConnectionState enum'

#Comments on ICE construction:
[Candidate construction](https://tools.ietf.org/html/rfc5245#page-73) 
assumption: the foundation will be the same for all connections made 
from the same standpoint.
assumption: The priority for a specific ice candidate will be the same.
assumption: No harm will be done by adding a non-functioning ICE candidate.

This new way of connecting will let all peers know if a connection is failing an act on it.


# Message Types:
The following describes the different types of messages being passed in the system.

## joining
A peer sends this message along with an offer to the signaling server indicating its 
intention to join the network.

## answer-for-joining
The answer for the joining peer from the last peer in the chain.

## walker-joining-offer
This message goes through the signaling server to the first peer to connect
the walker to the network. In an actual network the peer sending the request,
simulated by the walker will already be in the network.

## walker-joining-answer
Answer for walker when joining.

## walker-joining-ice-candidate
Ice candidate for walker on the firstPeerCon

## ice-candidate-for-peer
Ice candidate from the walker to a peer.

## ice-candidate-for-walker
Ice candidate from the peer to a walker.

## answer-for-walker
The answer for the walker, sent right after its creation, using trickle ice.

