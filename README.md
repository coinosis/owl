![heroku](http://heroku-badge.herokuapp.com/?app=coinosis&svg=1)

# Install owl

## prerequisite

* [mongodb](https://docs.mongodb.com/manual/administration/install-community/)

## install

```bash

git clone https://github.com/coinosis/owl -b dev
cd owl
npm install
mkdir db
npm install -g nodemon

```

## run

Since owl creates Ethereum transactions on its own, you need to provide it the private key of a funded Ethereum account. Store it in `.privateKey`

```bash

npm run start:dev

```

If running for the first time, run `scripts/initialize.sh`.

# Development

## Submit your changes

1. Add the relevant tests in the `test` folder
2. Make sure all tests are successful: `npm test` (you can run a specific test file with `npm test -- test/<file>.js`)
3. Correct any linting errors: `npx eslint .`
4. Create a pull request targeting the `dev` branch

## interact with the database

```bash

$ mongo coinosis
> users = db.getCollection('users')
> users.find()

```

# DevOps

## deploy to heroku

1. create a heroku account
2. install the mongolab add-on
3. deploy the code
2. install [heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)
4. `DB=$(heroku config:get DB -a <your-app-name>) scripts/initialize.sh`

## backup the production database & restore to any database

```bash

$ scripts/backup.sh
> backup created at ./backup/2020-06-22T18:17:32-05:00
$ scripts/restore.sh testing backup/2020-06-22T18\:17\:32-05\:00/

```

## migrate data from production to testing to development

```bash

scripts/prod2test.sh
npm run start:dev
scripts/test2dev.sh

```
