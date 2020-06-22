#! /bin/bash

if [ "$#" -ne 2 ]; then
  echo "Usage: ./scripts/restore.sh <environment> <sourcePath>"
  echo "Example: ./scripts/restore.sh development backup/2020-06-22T17\:40\:32-05\:00/"
  exit 1
fi

productionURI="$(heroku config:get MONGODB_URI -a coinosis)"
testingURI="$(heroku config:get MONGODB_URI -a testing-owl)"
developmentURI=mongodb://localhost/coinosis

productionDB=heroku_t2bt9b8m
testingDB=heroku_7m49q4bs
developmentDB=coinosis

target=${1}
sourcePath=${2}

if [ ${target} = "development" ]; then
  targetURI=${developmentURI}
  targetDB=${developmentDB}
elif [ ${target} = "testing" ]; then
  targetURI=${testingURI}
  tardetDB=${testingDB}
elif [ ${target} = "production" ]; then
  targetURI=${productionURI}
  targetDB=${productionDB}
fi

echo "restoring ${sourcePath} into ${targetURI} ${targetDB}..."

mongo ${targetURI} ./scripts/deleteAll.js &&
mongorestore --uri=${targetURI} -d ${targetDB} ${sourcePath}
