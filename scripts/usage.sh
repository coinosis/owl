#! /bin/bash

totalHeroku=1000
remainingHeroku=$(heroku ps --app=coinosis | grep remaining \
                      | cut --fields=8 --delimiter=' ' \
                      | grep --only-matching "[0-9]*")
usageHeroku=$((totalHeroku - remainingHeroku))
percentageHeroku=$((100 * usageHeroku / totalHeroku))

# assuming all months have 30 days
totalMonth=30
usageMonth=$(date --iso-8601 | cut --fields=3 --delimiter='-')
percentageMonth=$((100 * usageMonth / totalMonth))

echo "Heroku usage: ${usageHeroku}h - ${percentageHeroku}%"
echo "Month usage: ${usageMonth}d - ${percentageMonth}%"
