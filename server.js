const express = require('express');
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
  const events = db.collection('events');
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
        || !utils.isAddress(address)
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
    const nameCount = await users.countDocuments({name});
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

  app.get('/events', async (req, res) => {
    const eventList = await events.find().toArray();
    res.json(eventList);
  });

  app.get('/event/:url([a-z0-9-]{1,60})', async (req, res) => {
    const { url } = req.params;
    const eventFilter = await events.find({url}).toArray();
    if (!eventFilter.length) {
      res.status(404).json('event not found');
      return;
    }
    res.json(eventFilter[0]);
  });

  app.get('/event/:url([a-z0-9-]{1,60})/attendees', async (req, res) => {
    const { url } = req.params;
    const eventFilter = await events.find({url}).toArray();
    if (!eventFilter.length) {
      res.status(404).json('event not found');
      return;
    }
    const attendeeAddresses = eventFilter[0].attendees;
    const userFilter = await users
          .find({address: { $in: attendeeAddresses}})
          .toArray();
    res.json(userFilter);
  });

  app.post('/events', async (req, res) => {
    const params = Object.keys(req.body);
    const expectedParams = [
      'name',
      'url',
      'description',
      'fee',
      'start',
      'end',
      'organizer',
      'signature',
    ];
    if(!expectedParams.every(param => params.includes(param))) {
      res.status(400).json('wrong param names');
      console.error(params);
      return;
    }
    const {
      name,
      url,
      description,
      fee,
      start,
      end,
      organizer,
      signature,
    } = req.body;
    if (
      name === ''
        || !/^[a-z0-9-]{1,60}$/.test(url)
        || description === ''
        || isNaN(Number(fee))
        || isNaN(new Date(start).getTime())
        || isNaN(new Date(end).getTime())
        || !utils.isAddress(organizer)
        || !/^0x[0-9a-f]+$/.test(signature)
    ) {
      res.status(400).json('wrong param values');
      console.error(req.body);
      return;
    }
    const object = { name, url, description, fee, start, end, organizer };
    const payload = JSON.stringify(object);
    const hex = utils.utf8ToHex(payload);
    let signer;
    try {
      signer = accounts.recover(hex, signature);
    } catch (err) {
      res.status(401).json('malformed signature');
      console.error(object, signature);
      return;
    }
    if (signer !== organizer) {
      res.status(401).json('wrong signature');
      console.error(organizer, signer);
      return;
    }
    const nameCount = await events.countDocuments({name});
    if (nameCount !== 0) {
      res.status(400).json('event name already exists');
      console.error(nameCount, name);
      return;
    }
    const urlCount = await events.countDocuments({url});
    if (urlCount !== 0) {
      res.status(400).json('event url already exists');
      console.error(urlCount, name);
      return;
    }
    const feeAmount = Number(fee);
    if (feeAmount < 0 || feeAmount === Infinity) {
      res.status(400).json('invalid fee');
      console.error(feeAmount);
      return;
    }
    const creationDate = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    // if (endDate <= startDate || creationDate > startDate) {
    //   res.status(400).json('invalid date values');
    //   console.error(startDate, endDate);
    //   return;
    // }
    const userCount = await users.countDocuments({address: organizer});
    if (userCount === 0) {
      res.status(400).json('organizer unregistered');
      console.error(organizer);
      return;
    }
    const attendees = [ organizer ];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const event = {
      name,
      url,
      description,
      fee: feeAmount,
      start: startDate,
      end: endDate,
      organizer,
      signature,
      attendees,
      creation: creationDate,
      ip,
    }
    const effect = await events.insertOne(event);
    if (effect.result.ok && effect.ops.length) {
      res.status(201).json(effect.ops[0]);
    } else {
      res.status(500).end();
      console.error(effect);
    }
  });

  app.post('/attend', async (req, res) => {
    const params = Object.keys(req.body);
    if (
      !params.includes('attendee')
        || !params.includes('event')
        || !params.includes('signature')
    ) {
      res.status(400).json('wrong param names');
      console.error(params);
      return;
    }
    const { attendee, event, signature } = req.body;
    if (
      !utils.isAddress(attendee)
        || event === ''
        || !/^0x[0-9a-f]+$/.test(signature)
    ) {
      res.status(400).json('wrong param values');
      console.error(req.body);
    }
    const object = { attendee, event };
    const payload = JSON.stringify(object);
    const hex = utils.utf8ToHex(payload);
    let signer;
    try {
      signer = accounts.recover(hex, signature);
    } catch (err) {
      res.status(401).json('malformed signature');
      console.error(object, signature);
      return;
    }
    if (signer !== attendee) {
      res.status(401).json('wrong signature');
      console.error(attendee, signer);
      return;
    }
    const attendeeCount = await users.countDocuments({address: attendee});
    if (attendeeCount === 0) {
      res.status(400).json('attendee unregistered');
      console.error(attendee);
      return;
    }
    const eventFilter = await events.find({url: event}).toArray();
    if (eventFilter.length === 0) {
      res.status(400).json('this event doesn\'t exist');
      console.error(event);
      return;
    }
    const eventObject = eventFilter[0];
    const now = new Date();
    if (now > eventObject.end) {
      res.status(400).json('the event already finished');
      console.error(eventObject);
      return;
    }
    if (!eventObject.attendees.includes(attendee)) {
      eventObject.attendees.push(attendee);
      const effect = await events.replaceOne({url: event}, eventObject);
      if (effect.result.ok && effect.ops.length) {
        res.status(201).json(effect.ops[0]);
        return;
      } else {
        res.status(500).end();
        console.error(effect);
        return;
      }
    }
    res.end();
  });

  app.get('/assessments/:event([a-z0-9-]{1,60})', async (req, res) => {
    const { event } = req.params;
    const eventCount = await events.countDocuments({ url: event });
    if (eventCount === 0) {
      res.status(404).json('event not found');
      return;
    }
    const assessmentFilter = await assessments.find({ event }).toArray();
    res.json(assessmentFilter);
  });

  app.get(
    '/assessment/:event([a-z0-9-]{1,60})/:sender(0x[a-fA-F0-9]{40})',
    async (req, res) => {
      const { event, sender } = req.params;
      const eventCount = await events.countDocuments({ url: event });
      if (eventCount === 0) {
        res.status(404).json('event not found');
        return;
      }
      const assessmentFilter = await assessments
            .find({ event, sender })
            .toArray();
      if (!assessmentFilter.length) {
        res.status(404).json('assessment not found');
        return;
      }
      res.json(assessmentFilter[0]);
    }
  );

  app.post('/assessments', async (req, res) => {
    const params = Object.keys(req.body);
    if (
      !params.includes('event')
        || !params.includes('sender')
        || !params.includes('assessment')
        || !params.includes('signature')
    ) {
      res.status(400).json('wrong param names');
      console.error(params);
      return;
    }
    const { event, sender, assessment, signature } = req.body;
    if (
      !/^[a-z0-9-]{1,60}$/.test(event)
        || !utils.isAddress(sender)
        || typeof assessment !== 'object'
        || !/^0x[0-9a-f]+$/.test(signature)
    ) {
      res.status(400).json('wrong param values');
      console.error(event, sender, signature);
      return;
    }
    const payload = JSON.stringify({event, sender, assessment});
    const hex = utils.utf8ToHex(payload);
    let signer;
    try {
      signer = accounts.recover(hex, signature);
    } catch (err) {
      res.status(401).json('malformed signature');
      console.error(err.message);
      return;
    }
    if (signer !== sender) {
      res.status(401).json('bad signature');
      console.error(payload, signer, sender);
      return;
    }
    const assessmentCount = await assessments.countDocuments({sender, event});
    if (assessmentCount > 0) {
      res.status(400).json('assessment already exists');
      console.error(assessmentCount)
      return;
    }
    const eventFilter = await events.find({url: event}).toArray();
    if (eventFilter.length === 0) {
      res.status(404).json('event not found');
      console.error(event);
      return;
    }
    const eventObject = eventFilter[0];
    if (!eventObject.attendees.includes(sender)) {
      res.status(400).json('sender not attending event');
      console.error(eventObject.attendees, sender);
      return;
    }
    const addresses = Object.keys(assessment);
    for (const i in addresses) {
      if (!utils.isAddress(addresses[i])) {
        res.status(400).json('this is not an address');
        console.error(addresses[i]);
        return;
      }
      if (addresses[i] === sender) {
        res.status(400).json('sender can\'t assess themselves');
        console.error(addresses[i]);
        return;
      }
      if (!eventObject.attendees.includes(addresses[i])) {
        res.status(400).json('address not attending');
        console.error(eventObject.attendees, addresses[i]);
        return;
      }
    }
    const claps = Object.values(assessment);
    let totalClaps = 0;
    for (const i in claps) {
      if (
        isNaN(claps[i])
          || claps[i] < 0
          || Number(claps[i]) !== Math.round(claps[i])
      ) {
        res.status(400).json('this is no natural number');
        console.error(claps[i]);
        return;
      }
      totalClaps += claps[i];
    }
    if (totalClaps > (eventObject.attendees.length - 1) * 3) {
      res.status(400).json('maximum number of claps exceeded');
      console.error(totalClaps);
      return;
    }
    const object = req.body;
    object.date = new Date().toLocaleString('es-CO', dateOptions);
    object.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const effect = await assessments.insertOne(req.body);
    if (effect.result.ok && effect.ops.length) {
      res.status(201).json(effect.ops[0]);
    } else {
      res.status(500).end();
      console.error(effect);
    }
  });
});

app.listen(port);
