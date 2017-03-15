# Hej Nicholas!

Du skal åbne `index.html#init` i én browser-tab og `index.html` i en anden. Alt logic ligger i `main.js`

## TODO
Add timeout to peers, so we avoid hanging

## Boot Ubuntu from scratch
touch ~/.bash_aliases
echo "alias c='clear'" >> ~/.bash_aliases
echo "alias ll='ls -l'" >> ~/.bash_aliases
echo "alias h='cd'" >> ~/.bash_aliases
sudo apt-get update -y
sudo apt-get install nodejs -y
sudo apt-get install nodejs-legacy -y
sudo apt-get install npm -y
sudo apt-get install git -y
cd / 
git clone https://lindekaer:lextalioniS10@github.com/lindekaer/webrtc.git
cd /webrtc
git checkout jit-docker
npm install
npm run build
sudo apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common
curl -fsSL https://apt.dockerproject.org/gpg | sudo apt-key add -
sudo add-apt-repository \
       "deb https://apt.dockerproject.org/repo/ \
       ubuntu-$(lsb_release -cs) \
       main"
npm install -g nodemon
sudo apt-get -y install docker-engine
sudo apt-get -y install docker.io
docker pull ubuntu:14.04
docker build -t test .

## For thesis
Javascript eventloop - how are we using it on the signaling server?

(NOT FOUND) A case-study in all-web rich interpersonal communication services - http://dl.acm.org/citation.cfm?id=2749217
(NOT FOUND) Performance analysis of the Janus WebRTC gateway - http://dl.acm.org/citation.cfm?id=2749223
Real-time communications for the web - http://ieeexplore.ieee.org/document/6495756/?part=1
(NOT MUCH) Leveraging WebRTC for P2P content distribution in web browsers - http://ieeexplore.ieee.org/abstract/document/7160422/
(NOT MUCH) WebRTC, the day after - http://servicearchitecture.wp.tem-tsp.eu/files/2014/04/1569766727.pdf
WebRTC data channels - https://tools.ietf.org/id/draft-ietf-rtcweb-data-channel-05.txt
(NOT FOUND) WebRTC technology overview and signaling solution design and implementation - http://ieeexplore.ieee.org/abstract/document/7160422/
Browser-to-Browser Security Assurances for WebRTC - http://ieeexplore.ieee.org/abstract/document/6894480/
Determining the signalling overhead of two common WebRTC methods: JSON via XMLHttpRequest and SIP over WebSocket - http://ieeexplore.ieee.org/abstract/document/6757840/
Telemedicine for emergency care management using WebRTC - http://ieeexplore.ieee.org/abstract/document/7275865/
(SUPER) Jattack: a WebRTC load testing tool - http://ieeexplore.ieee.org.ez-itu.statsbiblioteket.dk:2048/xpls/icp.jsp?arnumber=7780247
(MIGHT BE USEFUL) Automating functional tests using Selenium - http://ieeexplore.ieee.org.ez-itu.statsbiblioteket.dk:2048/document/1667589/?arnumber=1667589&contentType=Conference%20Publications
(COPY OF OURS) WebRTCbench: a benchmark for performance assessment of webRTC implementations - http://ieeexplore.ieee.org.ez-itu.statsbiblioteket.dk:2048/xpls/icp.jsp?arnumber=7351769
