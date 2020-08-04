#! /bin/bash

date=$(date --iso-8601=seconds)
production="$(heroku config:get DB -a coinosis)"
mongodump --uri=${production} -o ./backup &&
mv ./backup/heroku_t2bt9b8m ./backup/${date}
echo "backup created at ./backup/${date}"
