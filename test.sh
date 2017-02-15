number="5"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ws://192.168.1.144:8080/socketserver --output-file "test_${number}.data"
  sleep 10
done

number="10"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ws://192.168.1.144:8080/socketserver --output-file "test_${number}.data"
  sleep 10
done

number="20"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ws://192.168.1.144:8080/socketserver --output-file "test_${number}.data"
  sleep 10
done

number="40"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ws://192.168.1.144:8080/socketserver --output-file "test_${number}.data"
  sleep 10
done