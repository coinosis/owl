#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
testing="$(heroku config:get MONGODB_URI -a coinosis-test)"
development=mongodb://localhost/coinosis

mongodump --uri=${testing} -o ${currentDir}/../testdb-backup/ &&
mongodump --uri=${development} -o ${currentDir}/../devdb-backup/ &&

mongorestore -d coinosis testdb-backup/heroku_7m49q4bs
