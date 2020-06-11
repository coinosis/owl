#! /bin/bash

mongod --dbpath=db &
PRIVATE_KEY=$(cat ./.privateKey) nodemon ./server.js
