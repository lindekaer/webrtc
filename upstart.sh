#! /bin/bash
export DISPLAY=:10
export LOG_FILE=/var/log/browser-xvfb.log
Xvfb :10 -screen 0 1366x768x24 -ac 2>/dev/null 1>&2 &
sleep 1
echo "Running!"
node /app/selenium-test.js $1
