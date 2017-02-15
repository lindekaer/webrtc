env=$1
signaling_server=$2

number="5"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 10
done

number="10"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 10
done

number="20"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 10
done

number="40"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 10
done