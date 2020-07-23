#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
staging="$(heroku config:get MONGODB_URI -a staging-owl)"
testing="$(heroku config:get MONGODB_URI -a testing-owl)"

mongodump --uri=${staging} -o ${currentDir}/../backup/st/ &&
mongodump --uri=${testing} -o ${currentDir}/../backup/test/ &&

mongo ${testing} ${currentDir}/deleteAll.js &&
mongorestore --uri=${testing} -d heroku_7m49q4bs ${currentDir}/../backup/st/heroku_0sbhf7ks/