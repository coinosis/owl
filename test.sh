#! /bin/bash

pkill mongod
pkill node
rm -rf unitdb
mkdir -p unitdb
mongod --dbpath=unitdb > /dev/null &
node server.js &
sleep 1
npx mocha
pkill node
pkill mongod
