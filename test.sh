#! /bin/bash

rm -rf unitdb
mkdir -p unitdb
mongod --dbpath=unitdb > /dev/null &
node index.js &
sleep 1
npx mocha
pkill node
pkill mongod
