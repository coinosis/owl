#! /bin/bash

rm -rf unitdb
mkdir -p unitdb
mongod --dbpath=unitdb --port=1234 > /dev/null &
PORT=5678 MONGODB_URI=mongodb://localhost:1234/coinosis node server.js &
sleep 1
npx mocha
fuser -k 5678/tcp 2> /dev/null
fuser -k 1234/tcp 2> /dev/null
