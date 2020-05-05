#! /bin/bash

if [ -z ${1} ]; then
    MONGODB_URI=coinosis
else
    MONGODB_URI=$(heroku config:get MONGODB_URI -a ${1})
fi
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
mongo ${MONGODB_URI} ${DIR}/initialize.js

