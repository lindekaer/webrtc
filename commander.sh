
mode=$1

if [ $mode = "spawn1" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-dice; 
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 1 --num-peers 1 --mode spawn --signaling-url ws://188.226.135.47:8080/socketserver --timeout 1000000 --first-peer;
EOF
ssh root@192.241.153.93 -t ${command}
fi

if [ $mode = "spawn2" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-dice;
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 1 --num-peers 1 --mode spawn --signaling-url ws://188.226.135.47:8080/socketserver --timeout 1000000;
EOF
ssh root@207.154.228.89 -t ${command}
fi

if [ $mode = "walker" ]
then
read -d '' command << EOF
  cd /webrtc;
  git stash;
  git fetch --all;
  git checkout experiment-dice;
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 2 --num-peers 1 --mode walker --signaling-url ws://188.226.135.47:8080/socketserver --id experiment-1;
EOF
ssh root@46.101.81.163 -t ${command}
fi