#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
production="$(heroku config:get MONGODB_URI -a coinosis)"
testing="$(heroku config:get MONGODB_URI -a testing-owl)"

mongodump --uri=${production} -o ${currentDir}/../proddb-backup/ &&
mongodump --uri=${testing} -o ${currentDir}/../testdb-backup/ &&

mongo ${testing} ${currentDir}/deleteAll.js &&
mongorestore --uri=${testing} -d heroku_7m49q4bs ${currentDir}/../proddb-backup/heroku_t2bt9b8m/
