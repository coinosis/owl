#! /bin/bash

mongod --dbpath=db > /dev/null &
source .secret
nodemon ./src/server.js &
./loclx.sh
