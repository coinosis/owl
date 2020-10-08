![heroku](http://heroku-badge.herokuapp.com/?app=coinosis&svg=1)

# Install owl

## prerequisites

* [mongodb](https://docs.mongodb.com/manual/administration/install-community/)
In order to test that it was installed correctly run `mongod --dbpath=db`, inside the root of **owl**.

* [localXpose](https://localxpose.io/#download)
You need to have localXpose installed as an CLI, if you want to expose your local environment to PayU. Bear in mind that you need to add `loclx` to your `PATH`.

## install

```bash

git clone https://github.com/coinosis/owl -b dev
cd owl
npm install
npm install -g nodemon

```

## `.secret` file

You need a `.secret` file with sensitive information about your proyect.

1. `cp secret.template .secret # notice dot '.' prefix on .secret filename`
2. Fill the `PRIVATE_KEY` variable with the 0x-prefixed private key of a funded Ethereum account. It should be funded on whatever network you're operating on.
3. Optionally fill the YouTube variables with information about your YouTube account. Use [this script](https://github.com/coinosis/owl/blob/dev/scripts/youtubeRefreshToken.sh) to get the refresh token.
4. Optionally fill the PayPal variables with your PayPal account info.

## run

```bash

npm run start:dev

```

If running for the first time, run `scripts/initialize.sh`.

# expose your local environment

In order to expose your local environment to a public domain for PayU transactions, run

`./loclx.sh <loclx-id>`

Bear in mind that you need to specify this same `loclx-id` argument when runnig [cow](https://github.com/coinosis/cow).

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

## deploy

1. create a mongoDB atlas account
1. create a heroku account
2. deploy the code
3. add the DB variable pointing to your mongoDB atlas db
3. install [heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install)
4. `DB=$(heroku config:get DB -a <your-app-name>) scripts/initialize.sh`

## backup the production database & restore to any database

```bash

$ scripts/backup.sh
> backup created at ./backup/2020-06-22T18:17:32-05:00
$ scripts/restore.sh testing backup/2020-06-22T18\:17\:32-05\:00/

```

## migrate data from production to staging to testing to development

```bash

scripts/prod2st.sh
scritps/st2test.sh
npm run start:dev # if it's not runnig already
scripts/test2dev.sh

```
