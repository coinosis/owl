#! /bin/bash

trap 'exit 130' INT

mongod --dbpath=db > /dev/null &
sleep 1
scripts/cleanDev.sh
source .secret
nodemon src/server.js
