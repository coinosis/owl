#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
production="$(heroku config:get MONGODB_URI -a coinosis)"
testing="$(heroku config:get MONGODB_URI -a coinosis-test)"
development=mongodb://localhost/coinosis

mongodump --uri=${production} -o proddb-backup/ &&
mongodump --uri=${testing} -o testdb-backup/ &&
mongodump --uri=${development} -o devdb-backup/ &&

mongo ${development} ${currentDir}/deleteAll.js &&
mongorestore -d coinosis testdb-backup/heroku_7m49q4bs &&

mongo ${testing} ${currentDir}/deleteAll.js &&
mongorestore --uri=${testing} -d heroku_7m49q4bs proddb-backup/heroku_t2bt9b8m/
