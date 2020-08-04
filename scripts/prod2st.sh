#! /bin/bash

currentDir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
production="$(heroku config:get DB -a coinosis)"
staging="$(heroku config:get DB -a staging-owl)"

mongodump --uri=${production} -o ${currentDir}/../backup/prod/ &&
mongodump --uri=${staging} -o ${currentDir}/../backup/st/ &&

mongo ${staging} ${currentDir}/deleteAll.js &&
mongorestore --uri=${staging} -d heroku_0sbhf7ks ${currentDir}/../backup/prod/heroku_t2bt9b8m/
