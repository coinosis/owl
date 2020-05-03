#! /bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
mongo ${MONGODB_URI:-coinosis} ${DIR}/initialize.js
