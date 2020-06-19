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

Since owl creates Ethereum transactions on its own, you need to provide it the private key of an Ethereum account. Store it in `.privateKey`

```bash

npm run start:dev

```

If running for the first time, run `scripts/initialize.sh`.

# Development

## Submit your changes

1. Add the relevant tests in `test.js`
2. Make sure all tests are successful: `npm test`
3. Create a pull request targeting the `dev` branch

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
4. `MONGODB_URI=$(heroku config:get MONGODB_URI -a <your-app-name>) scripts/initialize.sh`

## migrate data from production

```bash

scripts/prod2test.sh
npm run start:dev
scripts/test2dev.sh

```
