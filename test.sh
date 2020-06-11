#! /bin/bash

rm -rf unitdb
mkdir -p unitdb
mongod --dbpath=unitdb --port=1234 > /dev/null &
export PORT=5678
export MONGODB_URI=mongodb://localhost:1234/coinosis
export PRIVATE_KEY=$(cat ./.privateKey)
node server.js &
unset PRIVATE_KEY
sleep 1
npx mocha
fuser -k 5678/tcp 2> /dev/null
fuser -k 1234/tcp 2> /dev/null
