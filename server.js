const express = require('express');
const Web3Utils = require('web3-utils');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const Web3EthAccounts = require('web3-eth-accounts');
const utils = require('web3-utils');

const port = process.env.PORT || 3000;
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinosis';
const dateOptions = {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
  timeStyle: 'medium'
};
const infuraURI =
      'wss://mainnet.infura.io/ws/v3/58a2b59a8caa4c2e9834f8c3dd228b06';
const accounts = new Web3EthAccounts(infuraURI);

const app = express();
app.use(express.json());
app.use(cors());
const dbClient = new MongoClient(dbUrl, { useUnifiedTopology: true });
const version = '1.0.0';

dbClient.connect((error) => {
  if(error) {
    console.error(error);
    return;
  }
  const db = dbClient.db();
  const users = db.collection('users');
  const assessments = db.collection('assessments');

  app.get('/', (req, res) => {
    res.json({version});
  });

  app.get('/users', async (req, res) => {
    const userList = await users.find().toArray();
    res.json(userList);
  });

  app.get('/user/:address(0x[a-fA-F0-9]{40})', async (req, res) => {
    const query = {address: req.params.address};
    const userFilter = await users.find(query).toArray();
    if (!userFilter.length) {
      res.status(404).json('user not found');
      return;
    }
    res.json(userFilter[0]);
  });

  app.post('/users', async (req, res) => {
    const params = Object.keys(req.body);
    if (
      !params.includes('name')
        || !params.includes('address')
        || !params.includes('signature')
    ) {
      res.status(400).json('wrong param names');
      console.error(params);
      return;
    }
    const { name, address, signature } = req.body;
    if (
      name === ''
        || !Web3Utils.isAddress(address)
        || signature === ''
    ) {
      res.status(400).json('wrong param formats');
      console.error(name, address, signature);
      return;
    }
    const payload = JSON.stringify({address, name});
    const hex = utils.utf8ToHex(payload);
    let signer;
    try {
      signer = accounts.recover(hex, signature);
    } catch (err) {
      res.status(400).json('malformed signature');
      console.error(err.message);
      return;
    }
    if (signer !== address) {
      res.status(401).json('bad signature');
      console.error(payload, signer, signature);
      return;
    }
    const nameCount = await users.countDocuments({name})
    if (nameCount > 0) {
      res.status(400).json('name exists');
      console.error(nameCount);
      return;
    }
    const addressCount = await users.countDocuments({address});
    if (addressCount > 0) {
      res.status(400).json('address exists');
      console.error(addressCount);
      return;
    }
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const date = new Date().toLocaleString('es-CO', dateOptions);
    const effect = await users.insertOne({name, address, date, ip, signature});
    if (effect.result.ok && effect.ops.length) {
      res.status(201).json(effect.ops[0]);
    } else {
      res.status(500).end();
      console.error(effect);
    }
  });

  app.get('/assessments', async (req, res) => {
    const assessmentList = await assessments.find().toArray();
    res.json(assessmentList);
  });

  app.get('/assessment/:sender(0x[a-fA-F0-9]{40})', async (req, res) => {
    const query = {sender: req.params.sender};
    const assessmentFilter = await assessments.find(query).toArray();
    if (!assessmentFilter.length) {
      res.status(404).json('assessment not found');
      return;
    }
    res.json(assessmentFilter[0]);
  });

  app.post('/assessments', async (req, res) => {
    const params = Object.keys(req.body);
    if (
      !params.includes('sender')
        || !params.includes('assessment')
        || !params.includes('signature')
    ) {
      res.status(400).json('wrong param names');
      console.error(params);
      return;
    }
    const { sender, assessment, signature } = req.body;
    if (!Web3Utils.isAddress(sender)) {
      res.status(400).json('sender is not an address');
      console.error(sender);
      return;
    }
    if (signature === '') {
      res.status(400).json('empty signature');
      return;
    }
    const payload = JSON.stringify({sender, assessment});
    const hex = utils.utf8ToHex(payload);
    let signer;
    try {
      signer = accounts.recover(hex, signature);
    } catch (err) {
      res.status(400).json('malformed signature');
      console.error(err.message);
      return;
    }
    if (signer !== sender) {
      res.status(401).json('bad signature');
      console.error(payload, signer, signature);
      return;
    }
    if (typeof assessment !== 'object') {
      res.status(400).json('assessment is not an object');
      console.error(assessment);
      return;
    }
    const addresses = Object.keys(assessment);
    for (const i in addresses) {
      if (!Web3Utils.isAddress(addresses[i])) {
        res.status(400).json('this is not an address');
        console.error(addresses[i]);
        return;
      }
    }
    for (const i in addresses) {
      if (addresses[i] === sender) {
        res.status(400).json('sender can\'t assess themselves');
        console.error(addresses[i]);
        return;
      }
    }
    for (const i in addresses) {
      const userFilter = await users.find({address: addresses[i]}).toArray();
      if (userFilter.length < 1) {
        res.status(400).json('address not registered');
        console.error(addresses[i]);
        return;
      }
    }
    const claps = Object.values(assessment);
    let totalClaps = 0;
    for (const i in claps) {
      totalClaps += claps[i];
      if (
        isNaN(claps[i])
          || claps[i] < 0
          || Number(claps[i]) !== Math.round(claps[i])
      ) {
        res.status(400).json('this is no natural number');
        console.error(claps[i]);
        return;
      }
    }
    const userList = await users.find().toArray();
    if (totalClaps > (userList.length - 1) * 3) {
      res.status(400).json('maximum number of claps exceeded');
      console.error(totalClaps);
      return;
    }
    const userFilter = await users.find({address: sender}).toArray();
    if (userFilter.length < 1) {
      res.status(400).json('sender not registered');
      console.error(userList.map(user => user.address));
      return;
    }
    const assessmentFilter = await assessments.find({sender}).toArray();
    if (assessmentFilter.length > 0) {
      res.status(400).json('assessment already exists');
      console.error(assessmentFilter)
      return;
    }
    const object = req.body;
    object.date = new Date().toLocaleString('es-CO', dateOptions);
    object.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
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
