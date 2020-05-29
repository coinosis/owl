#! /bin/bash

if [ -z ${MONGODB_URI} ]; then
    MONGODB_URI=coinosis
fi
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
mongo ${MONGODB_URI} ${DIR}/initialize.js
echo "initialized ${MONGODB_URI}"
