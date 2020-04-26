const express = require('express');
const Web3Utils = require('web3-utils');
const MongoClient = require('mongodb').MongoClient;

const port = process.env.PORT || 3000;
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinosis';

const app = express();
app.use(express.json());
const dbClient = new MongoClient(dbUrl, { useUnifiedTopology: true });
dbClient.connect((error) => {
  if(error) {
    console.error(error);
    return;
  }
  const db = dbClient.db();
  const users = db.collection('users');

  app.get('/users', async (req, res) => {
    const userList = await users.find().toArray();
    res.status(200).json(userList);
  });

  app.post('/users', async (req, res) => {
    const params = Object.keys(req.body);
    if (!params.includes('name') || !params.includes('address')) {
      console.error(params);
      res.status(400).end();
      return;
    }
    const name = req.body.name;
    const address = req.body.address;
    if (name === '' || !Web3Utils.isAddress(address)) {
      console.error(name, address);
      res.status(400).end();
      return;
    }
    const nameCount = await users.countDocuments({name})
    if (nameCount > 0) {
      console.error(nameCount);
      res.status(400).end();
      return;
    }
    const addressCount = await users.countDocuments({address});
    if (addressCount > 0) {
      console.error(addressCount);
      res.status(400).end();
      return;
    }
    users.insertOne({name, address});
    res.status(201).end();
  });
});

app.listen(port);
