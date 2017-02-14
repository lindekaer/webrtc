# Hej Nicholas!

Du skal åbne `index.html#init` i én browser-tab og `index.html` i en anden. Alt logic ligger i `main.js`

## TODO
Add timeout to peers, so we avoid hanging

## Boot Ubuntu from scratch
rm -rf /etc/update-motd.d/99-one-click
cd / 
git clone https://lindekaer:lextalioniS10@github.com/lindekaer/webrtc.git
cd /webrtc
sudo apt-get update -y
sudo apt-get install nodejs -y
sudo apt-get install nodejs-legacy -y
sudo apt-get install npm -y
npm install
