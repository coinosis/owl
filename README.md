## prerequisites

* [mongodb](https://docs.mongodb.com/manual/administration/install-community/)

## install on a dev environment

```bash

git clone https://github.com/coinosis/owl -b test
cd owl
npm i

```

## run on a development environment

```bash

mkdir testdb
mongod --dbpath=devdb
npm i -g nodemon
nodemon index.js

```

## Submit your changes

1. Add the relevant tests in `test.js`
2. Make sure all tests run smoothly: `./test.sh`
3. Commit & push to the `test` branch
4. Check everything is working in [the test deployment](https://coinosis-test.herokuapp.com)
5. Create a pull request targeting the `master` branch
6. Once accepted the code will be running live in [the production deployment](https://coinosis.herokuapp.com)

## interact with the database

```bash

mongo
use coinosis
users = db.getCollection('users')
assessments = db.getCollection('assessments')
users.find()
assessments.find()

```

## deploy to heroku

1. create a heroku account
2. install the mongolab add-on
3. deploy the code

## migrate data from production

first, [install the heroku cli tool](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)

```bash

scripts/prod2test.sh
mongod --dbpath=devdb
scripts/test2dev.sh

```
