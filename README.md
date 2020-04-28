## install

```bash

git clone https://github.com/coinosis/owl
cd owl
npm i

```

## run on a development environment

```bash

npm i -g nodemon
nodemon index.js
mongod --dbpath=testdb

```

## interact with the database

```bash

mongo
use coinosis
users = db.getCollection('users')
users.find()

```

## deploy to heroku

1. create a heroku account
2. install the mongolab add-on
3. deploy the code
