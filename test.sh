echo "Starting test"

env=$1
signaling_server=$2

number="1"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

number="2"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

number="4"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

number="8"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

number="16"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

number="32"
for num in {1..5}
  do node dist/runner.js --num-containers 2 --num-peers ${number} --mode full --signaling-url ${signaling_server} --output-file "test_${env}_${number}.data"
  sleep 20
done

for num in 1 2 4 8 16 32
  do node ./data/calc.js --input-file ./data/test_${env}_${num}.data
done