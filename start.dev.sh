#! /bin/bash

mongod --dbpath=db > /dev/null &
PRIVATE_KEY=$(cat ./.privateKey) nodemon ./src/server.js
