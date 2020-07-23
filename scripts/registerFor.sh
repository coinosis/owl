#! /bin/bash

if [ "$#" -ne 3 ]; then
  echo "Usage: ./scripts/registertFor.sh <environment> <eventURL> <userAddress>"
  exit 1
fi

export ENVIRONMENT=$1
if [ $ENVIRONMENT = "testing" ]; then
  APP="testing-owl"
elif [ $ENVIRONMENT = "staging" ]; then
  APP="staging-owl"
elif [ $ENVIRONMENT = "production" ]; then
  APP="coinosis"
fi
if [ -n "$APP" ]; then
  export MONGODB_URI=$(heroku config:get MONGODB_URI -a $APP)
fi

export PRIVATE_KEY=$(cat .privateKey)
node scripts/registerFor.js $2 $3
