
mode=$1

if [ $mode = "spawn1" ]
then
read -d '' command << EOF
  docker stop $(docker ps -a -q)
  node dist/runner.js --num-containers 1 --num-peers 64 --mode spawn --signaling-url ws://174.138.65.125:8080/socketserver --first-peer;
EOF
ssh root@192.81.210.22 -t ${command}
fi

if [ $mode = "spawn2" ]
then
read -d '' command << EOF
  cd /webrtc; 
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 2 --num-peers 10 --mode spawn --signaling-url ws://188.226.135.47:8080/socketserver --timeout 120000;
EOF
ssh root@207.154.228.89 -t ${command}
fi
