
# signaling_server=$2

read -d '' command << EOF
  cd /webrtc; 
  git stash;
  git pull;
  npm run build;
  node dist/runner.js --num-containers 2 --num-peers 10 --mode spawn --signaling-url ws://188.226.135.47:8080/socketserver --timeout 120000;
EOF

ssh root@192.241.153.93 -t ${command}