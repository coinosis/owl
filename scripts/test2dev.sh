#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
testing="$(heroku config:get MONGODB_URI -a testing-owl)"
development=mongodb://localhost/coinosis

mongodump --uri=${testing} -o ${currentDir}/../backup/test/ &&
mongodump --uri=${development} -o ${currentDir}/../backup/dev/ &&

mongo ${development} ${currentDir}/deleteAll.js &&
mongorestore -d coinosis ${currentDir}/../backup/test/heroku_7m49q4bs
