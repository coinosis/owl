#! /bin/bash

if [ -z ${DB} ]; then
    DB=coinosis
fi
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
mongo ${DB} ${DIR}/initialize.js
echo "initialized."
