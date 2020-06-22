#! /bin/bash

production="$(heroku config:get MONGODB_URI -a coinosis)"
mongodump --uri=${production} -o ./backup &&
mv ./backup/heroku_t2bt9b8m ./backup/$(date --iso-8601=seconds)
