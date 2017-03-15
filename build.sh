#! /bin/bash

touch ~/.bash_aliases
echo "alias c='clear'" >> ~/.bash_aliases
echo "alias ll='ls -l'" >> ~/.bash_aliases
echo "alias h='cd'" >> ~/.bash_aliases
sudo apt-get update -y
sudo apt-get install nodejs -y
sudo apt-get install nodejs-legacy -y
sudo apt-get install npm -y
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