#! /bin/bash

production="$(heroku config:get MONGODB_URI -a coinosis)"
testing="$(heroku config:get MONGODB_URI -a coinosis-test)"
mongodump --uri=$production -o proddb/
mongorestore --uri=$testing -d heroku_7m49q4bs proddb/heroku_t2bt9b8m/
