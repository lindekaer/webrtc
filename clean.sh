#! /bin/bash

docker rmi $1
docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)