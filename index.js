const express = require('express');
const Web3Utils = require('web3-utils');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');

const port = process.env.PORT || 3000;
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinosis';

const app = express();
app.use(express.json());
app.use(cors());
const dbClient = new MongoClient(dbUrl, { useUnifiedTopology: true });

dbClient.connect((error) => {
  if(error) {
    console.error(error);
    return;
  }
  const db = dbClient.db();
  const users = db.collection('users');

  app.get('/', (req, res) => {
    res.end();
  });

  app.get('/users', async (req, res) => {
    const userList = await users.find().toArray();
    res.json(userList);
  });

  app.get('/user/:address(0x[a-fA-F0-9]{40})', async (req, res) => {
    const userFilter = await users.find({address: req.params.address})
          .toArray();
    if (!userFilter.length) {
      res.status(404).end();
      return;
    }
    res.json(userFilter[0]);
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
    const effect = await users.insertOne({name, address});
    if (effect.result.ok && effect.ops.length) {
      res.status(201).json(effect.ops[0]);
    } else {
      console.log(effect);
      res.status(500).end();
    }
  });
});

app.listen(port);
