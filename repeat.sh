for i in {1..200};
do
  node dist/runner.js --num-containers 1 --num-peers 4 --mode spawn --signaling-url ws://192.168.1.152:8080/socketserver --timeout 60000 &
  node dist/runner.js --num-containers 1 --num-peers 4 --mode spawn --signaling-url ws://192.168.1.152:8080/socketserver --timeout 60000 &
  node dist/runner.js --num-containers 1 --num-peers 4 --mode walker --signaling-url ws://192.168.1.152:8080/socketserver --output-file dummy.data --delay 30000
done
