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
  const assessments = db.collection('assessments');

  app.get('/', (req, res) => {
    res.end();
  });

  app.get('/users', async (req, res) => {
    const userList = await users.find().toArray();
    res.json(userList);
  });

  app.get('/user/:address(0x[a-fA-F0-9]{40})', async (req, res) => {
    const query = {address: req.params.address};
    const userFilter = await users.find(query).toArray();
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

  app.get('/assessment/:sender(0x[a-fA-F0-9]{40})', async (req, res) => {
    const query = {sender: req.params.sender};
    const assessmentFilter = await assessments.find(query).toArray();
    if (!assessmentFilter.length) {
      res.status(404).end();
      return;
    }
    res.json(assessmentFilter[0]);
  });

  app.post('/assessments', async (req, res) => {
    const params = Object.keys(req.body);
    if (params.length !== 2) {
      console.error('wrong param length');
      console.error(params.length);
      res.status(400).end();
      return;
    }
    if (!params.includes('sender') || !params.includes('assessment')) {
      console.error('wrong params');
      console.error(params);
      res.status(400).end();
      return;
    }
    const sender = req.body.sender;
    if (!Web3Utils.isAddress(sender)) {
      console.error('sender is not an address');
      console.error(sender);
      res.status(400).end();
      return;
    }
    const assessment = req.body.assessment;
    if (typeof assessment !== 'object') {
      console.error('assessment is not an object');
      console.error(assessment);
      res.status(400).end();
      return;
    }
    const addresses = Object.keys(assessment);
    const userList = await users.find().toArray();
    if (addresses.length !== userList.length - 1) {
      console.error('wrong assessment length');
      console.error(`${addresses.length} !== ${userList.length - 1}`);
      res.status(400).end();
      return;
    }
    for (const i in addresses) {
      if (!Web3Utils.isAddress(addresses[i])) {
        console.error('this is not an address');
        console.error(addresses[i]);
        res.status(400).end();
        return;
      }
    }
    const claps = Object.values(assessment);
    for (const i in claps) {
      if (
        isNaN(claps[i])
          || claps[i] < 0
          || Number(claps[i]) !== Math.round(claps[i])
      ) {
        console.error('this is no natural number');
        console.error(claps[i]);
        res.status(400).end();
        return;
      }
    }
    const userFilter = await users.find({address: sender}).toArray();
    if (userFilter.length < 1) {
      console.error('user not registered');
      console.error(userList.map(user => user.address));
      res.status(400).end();
      return;
    }
    const assessmentFilter = await assessments.find({sender}).toArray();
    if (assessmentFilter.length > 0) {
      console.error('assessment already exists');
      console.error(assessmentFilter)
      res.status(400).end();
      return;
    }
    const effect = await assessments.insertOne(req.body);
    if (effect.result.ok && effect.ops.length) {
      res.status(201).json(effect.ops[0]);
    } else {
      console.log(effect);
      res.status(500).end();
    }
  });
});

app.listen(port);
