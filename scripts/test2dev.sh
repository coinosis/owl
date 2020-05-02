#! /bin/bash

testing="$(heroku config:get MONGODB_URI -a coinosis-test)"
mongodump --uri=$testing -o testdb/
mongorestore -d coinosis testdb/heroku_7m49q4bs
