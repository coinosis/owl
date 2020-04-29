## install

First install mongodb in your system: https://docs.mongodb.com/manual/administration/install-community/

```bash

git clone https://github.com/coinosis/owl
cd owl
npm i

```

## run on a development environment

```bash

mkdir testdb
npx mongod --dbpath=testdb
npm i -g nodemon
nodemon index.js

```

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
