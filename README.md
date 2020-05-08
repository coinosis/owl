## prerequisites

* [mongodb](https://docs.mongodb.com/manual/administration/install-community/)
* [heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)

## install on a dev environment

```bash

git clone https://github.com/coinosis/owl -b test
cd owl
npm i
scripts/initialize.sh

```

## run on a development environment

```bash

mkdir db
npm i -g nodemon
npm run start:dev

```

## Submit your changes

1. Add the relevant tests in `test.js`
2. Make sure all tests run smoothly: `npm test`
3. Commit & push to the `test` branch
4. Check everything is working in [the test deployment](https://coinosis-test.herokuapp.com)
5. Create a pull request targeting the `master` branch
6. Once accepted the code will be running live in [the production deployment](https://coinosis.herokuapp.com)

## interact with the database

```bash

$ mongo coinosis
> users = db.getCollection('users')
> assessments = db.getCollection('assessments')
> users.find()
> assessments.find()

```

## deploy to heroku

1. create a heroku account
2. install the mongolab add-on
3. deploy the code
4. `scripts/initialize.sh <your-heroku-app-name>`

## migrate data from production

```bash

scripts/prod2test.sh
npm run start:dev
scripts/test2dev.sh

```
