const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const {
  HttpError,
  handleError,
  errors,
  checkOptionalParams,
  checkSignature,
  checkUserExists,
  isEmail,
  isTelegram,
} = require('./control.js');
const {
  users,
  events,
  assessments,
  payments,
  distributions
} = require('./db.js');
const { web3, getETHPrice, getGasPrice } = require('./web3.js');
const { paymentReceived, getPayments, getHash } = require('./payu.js');
const { getUsers, } = require('./users.js');

const port = process.env.PORT || 3000;
const dateOptions = {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
  timeStyle: 'medium'
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/', (req, res) => {
  res.end();
});

app.get('/eth/price', async (req, res, next) => {
  try {
    const price = await getETHPrice();
    res.json(price);
  } catch (err) {
    handleError(err, next)
  }
});

app.get('/eth/gas', async (req, res, next) => {
  try {
    const price = await getGasPrice();
    res.json(price);
  } catch (err) {
    handleError(err, next)
  }
});

app.post('/payu', (req, res, next) => {
  try {
    paymentReceived(req);
    res.status(201).end();
  } catch (err) {
    handleError(err, next);
  }
});

app.get(
  '/payu/:event([a-z0-9-]{1,60})/:user(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, user } = req.params;
      const paymentList = await getPayments(event, user);
      res.json(paymentList);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/payu/hash', async (req, res, next) => {
  try {
    const hash = await getHash(req);
    res.json(hash);
  } catch (err) {
    handleError(err, next)
  }
});

app.get('/users', async (req, res) => {
  const users = await getUsers();
  res.json(users);
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

app.put('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => { try {
  const { address } = req.params;
  await checkSignature(address, req);
  const params = {
    email: isEmail,
    telegram: isTelegram,
  };
  await checkOptionalParams(params, req);
  await checkUserExists(users, address);
  const { email, telegram } = req.body;
  if (email) {
    const result = await users.updateOne({ address }, { $set: { email }});
  }
  if (telegram) {
    const result = await users.updateOne({ address }, { $set: { telegram }});
  }
  const user = await users.findOne({ address });
  res.json(user);
} catch (err) { handleError(err, next); }});

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
      || !web3.utils.isAddress(address)
      || signature === ''
  ) {
    res.status(400).json('wrong param formats');
    console.error(name, address, signature);
    return;
  }
  const payload = JSON.stringify({address, name});
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
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
  const date = new Date().toLocaleString('es-CO', dateOptions);
  const effect = await users.insertOne({name, address, date, signature});
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

// only used for pre-v2.0.0 events
app.get('/event/:url([a-z0-9-]{1,60})/attendees', async (req, res, next) => {
  try {
    const { url } = req.params;
    const event = await events.findOne({ url });
    if (!event) {
      throw new HttpError(404, errors.NOT_FOUND);
    }
    const { attendees } = event;
    const userList = await users
          .find({ address: { $in: attendees }})
          .toArray();
    const sortedUsers = userList.sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedUsers);
  } catch (err) { handleError(err, next); }
});

app.get('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const distribution = await distributions.findOne({ event });
    if (!distribution)
      throw new HttpError(404, errors.DISTRIBUTION_NONEXISTENT);
    res.json(distribution);
  } catch (err) { handleError(err, next) }
});

app.put('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const eventCount = await events.countDocuments({ url: event });
    if (eventCount == 0) throw new HttpError(404, errors.EVENT_NONEXISTENT);
    const distributionCount = await distributions.countDocuments({ event });
    if (distributionCount != 0)
      throw new HttpError(400, errors.DISTRIBUTION_EXISTS);
    const ethPrice = await getETHPrice();
    distributions.insertOne({ event, ethPrice });
    res.status(201).end();
  } catch (err) { handleError(err, next) }
});

app.post('/events', async (req, res, next) => { try {
  const params = Object.keys(req.body);
  const expectedParams = [
    'address',
    'name',
    'url',
    'description',
    'feeWei',
    'start',
    'end',
    'beforeStart',
    'afterEnd',
    'organizer',
    'signature',
  ];
  if(!expectedParams.every(param => params.includes(param))) {
    res.status(400).json('wrong param names');
    console.error(params);
    return;
  }
  const {
    address,
    name,
    url,
    description,
    feeWei,
    start,
    end,
    beforeStart,
    afterEnd,
    organizer,
    signature,
  } = req.body;
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(address)
      || name === ''
      || !/^[a-z1-9-]{1}[a-z0-9-]{0,59}$/.test(url)
      || description === ''
      || isNaN(Number(feeWei))
      || isNaN(new Date(start).getTime())
      || isNaN(new Date(end).getTime())
      || isNaN(new Date(beforeStart).getTime())
      || isNaN(new Date(afterEnd).getTime())
      || !web3.utils.isAddress(organizer)
      || !/^0x[0-9a-f]+$/.test(signature)
  ) {
    res.status(400).json('wrong param values');
    console.error(req.body);
    return;
  }
  const object = {
    address,
    name,
    url,
    description,
    feeWei,
    start,
    end,
    beforeStart,
    afterEnd,
    organizer,
  };
  const payload = JSON.stringify(object);
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
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
  const addressCount = await events.countDocuments({address});
  if (addressCount !== 0) {
    throw new HttpError(400, ADDRESS_EXISTS);
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
  const feeAmount = Number(feeWei);
  if (feeAmount < 0 || feeAmount === Infinity) {
    res.status(400).json('invalid fee');
    console.error(feeAmount);
    return;
  }
  const creationDate = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const beforeStartDate = new Date(beforeStart);
  const afterEndDate = new Date(afterEnd);
  if (
    creationDate > startDate
      || beforeStartDate > startDate
      || startDate >= endDate
      || endDate > afterEndDate
  ) {
    res.status(400).json('invalid date values');
    console.error(beforeStartDate, startDate, endDate, afterEndDate);
    return;
  }
  const userCount = await users.countDocuments({address: organizer});
  if (userCount === 0) {
    res.status(400).json('organizer unregistered');
    console.error(organizer);
    return;
  }
  const version = 2;
  const event = {
    address,
    name,
    url,
    description,
    feeWei,
    start: startDate,
    end: endDate,
    beforeStart: beforeStartDate,
    afterEnd: afterEndDate,
    organizer,
    signature,
    creation: creationDate,
    version,
  }
  const effect = await events.insertOne(event);
  if (effect.result.ok && effect.ops.length) {
    res.status(201).json(effect.ops[0]);
  } else {
    res.status(500).end();
    console.error(effect);
  }
} catch (err) { handleError(err, next); }});

// only for pre-v2.0.0 events
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

// only for pre-v2.0.0 events
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

// TODO: update for v2.0.0 events
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
      || !web3.utils.isAddress(sender)
      || typeof assessment !== 'object'
      || !/^0x[0-9a-f]+$/.test(signature)
  ) {
    res.status(400).json('wrong param values');
    console.error(event, sender, signature);
    return;
  }
  const payload = JSON.stringify({event, sender, assessment});
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
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
  // if (!eventObject.attendees.includes(sender)) {
  //   res.status(400).json('sender not attending event');
  //   console.error(eventObject.attendees, sender);
  //   return;
  // }
  const addresses = Object.keys(assessment);
  for (const i in addresses) {
    if (!web3.utils.isAddress(addresses[i])) {
      res.status(400).json('this is not an address');
      console.error(addresses[i]);
      return;
    }
    if (addresses[i] === sender) {
      res.status(400).json('sender can\'t assess themselves');
      console.error(addresses[i]);
      return;
    }
    // if (!eventObject.attendees.includes(addresses[i])) {
    //   res.status(400).json('address not attending');
    //   console.error(eventObject.attendees, addresses[i]);
    //   return;
    // }
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
  // if (totalClaps > (eventObject.attendees.length - 1) * 3) {
  //   res.status(400).json('maximum number of claps exceeded');
  //   console.error(totalClaps);
  //   return;
  // }
  const now = new Date();
  if (now < eventObject.beforeStart) {
    res.status(400).json('the event hasn\'t started');
    console.error(eventObject);
    return;
  }
  const object = req.body;
  object.date = now;
  const effect = await assessments.insertOne(object);
  if (effect.result.ok && effect.ops.length) {
    res.status(201).json(effect.ops[0]);
  } else {
    res.status(500).end();
    console.error(effect);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json(err.message);
});

app.listen(port);
