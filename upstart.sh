#! /bin/bash

## XVFB conf
export DISPLAY=:10
export LOG_FILE=/var/log/browser-xvfb.log
Xvfb :10 -screen 0 1366x768x24 -ac 2>/dev/null 1>&2 &

## Take a small break
sleep 1

## Fix to avoid hanging Selenium instances
## https://github.com/SeleniumHQ/docker-selenium/pull/182
export DBUS_SESSION_BUS_ADDRESS=/dev/null

type=$1
signaling_url=$2
number_peers=$3
uuid=$4

echo $signaling_url

## Find and replace variables in HTML
sed -i "s|SIGNALING_URL|${signaling_url}|g" /app/peer.html
sed -i "s|SIGNALING_URL|${signaling_url}|g" /app/walker.html

sed -i "s|SIGNALING_UUID|${uuid}|g" /app/peer.html
sed -i "s|SIGNALING_UUID|${uuid}|g" /app/walker.html

## Start Selenium
echo "--->"
echo "Starting Selenium..."
echo "TYPE: ${type}"
echo "URL: ${signaling_url}"
echo "PEERS: ${number_peers}"
echo "UUID: ${uuid}"
echo "--->"

node /app/selenium-test.js $type $number_peers $guid
