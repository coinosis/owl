## prerequisites

* [mongodb](https://docs.mongodb.com/manual/administration/install-community/)
* [heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)

## install

```bash

git clone https://github.com/coinosis/owl -b dev
cd owl
npm i
mkdir db
npm i -g nodemon

```

## run

* Store the private key in owl/.privateKey4

```bash

npm run start:dev

```

If running for the first time, run `scripts/initialize.sh`.

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

## deploy to heroku

1. create a heroku account
2. install the mongolab add-on
3. deploy the code
4. `MONGODB_URI=$(heroku config:get MONGODB_URI -a <your-app-name>) scripts/initialize.sh`

## migrate data from production

```bash

scripts/prod2test.sh
npm run start:dev
scripts/test2dev.sh

```
