# Hej Nicholas!

Du skal åbne `index.html#init` i én browser-tab og `index.html` i en anden. Alt logic ligger i `main.js`

## TODO
Add timeout to peers, so we avoid hanging

## Boot Ubuntu from scratch
rm -rf /etc/update-motd.d/99-one-click
touch ~/.bash_aliases
echo "alias c=clear" >> ~/.bash_aliases
echo "alias ll=ls -l" >> ~/.bash_aliases
echo "alias h=cd" >> ~/.bash_aliases
sudo apt-get update -y
sudo apt-get install nodejs -y
sudo apt-get install nodejs-legacy -y
sudo apt-get install npm -y
cd / 
git clone https://lindekaer:lextalioniS10@github.com/lindekaer/webrtc.git
cd /webrtc
git checkout jit-docker
npm install
docker pull ubuntu:14.04
docker build -t test .

## For thesis
Javascript eventloop - how are we using it on the signaling server?