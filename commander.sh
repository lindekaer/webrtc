
mode=$1

if [ $mode = "spawn1" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-data-channel; 
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 1 --num-peers 256 --mode spawn --signaling-url ws://174.138.65.125:8080/socketserver --timeout 120000000 --first-peer;
EOF
ssh root@192.81.210.22 -t ${command}
fi

if [ $mode = "spawn2" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-data-channel;
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 1 --num-peers 256 --mode spawn --signaling-url ws://174.138.65.125:8080/socketserver --timeout 120000000;
EOF
ssh root@207.154.192.25 -t ${command}
fi

if [ $mode = "walker" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-data-channel;
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 2 --num-peers 256 --mode walker --signaling-url ws://174.138.65.125:8080/socketserver --id experiment-1;
EOF
ssh root@188.166.157.144 -t ${command}
fi

if [ $mode = "clean" ]
then
ssh root@192.81.210.22 -t 'docker stop $(docker ps -a -q)'
sleep 2
ssh root@207.154.192.25 -t 'docker stop $(docker ps -a -q)'
sleep 2
ssh root@188.166.157.144 -t 'docker stop $(docker ps -a -q)'
fi




