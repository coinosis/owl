#! /bin/bash

date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
production="$(heroku config:get DB -a coinosis)"
mongodump --uri=${production} -o ./backup &&
mv ./backup/heroku_t2bt9b8m ./backup/${date}
echo "backup created at ./backup/${date}"
