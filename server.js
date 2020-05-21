const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const cors = require('cors');
const Web3EthAccounts = require('web3-eth-accounts');
const utils = require('web3-utils');
const fetch = require('node-fetch');
const settings = require('./settings.json');
const crypto = require('crypto');

const environment = process.env.ENVIRONMENT || 'testing';
const environmentId = settings[environment].id;
const payUReports = settings[environment].payUReports;
const payULogin = process.env.PAYU_LOGIN || 'pRRXKOl8ikMmt9u';
const payUKey = process.env.PAYU_KEY || '4Vj8eK4rloUd272L48hsrarnUA';
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
app.use(express.urlencoded({ extended: true }));
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
  const payments = db.collection('payments');

  app.get('/', (req, res) => {
    res.json({version});
  });

  app.post('/payu', (req, res) => {
    payments.insertOne({
      body: req.body,
      metadata: {
        date: new Date(),
        ip: req.connection.remoteAddress,
        reference: req.body.reference_sale,
      },
      headers: req.headers,
    });
    res.json('');
  });

  app.get(
    '/payu/:event([a-z0-9-]{1,60})/:user(0x[a-fA-F0-9]{40})',
    async (req, res, next) => {
      const { event, user } = req.params;
      let counter = 1;
      let pull, push = null;
      const paymentList = [];
      do {
        const referenceCode = `${event}:${user}:${counter}:${environmentId}`;
        pull = await pullPayment(referenceCode);
        push = await pushPayment(referenceCode);
        if (pull === null && push === null) break;
        if (
          pull
            && push
            && pull.status === 'APPROVED'
            && push.status === 'APPROVED'
            && pull.currency === 'USD'
            && push.currency === 'USD'
        ) {
          const eventObject = await events.findOne({url: event});
          if (pull.value == eventObject.fee && push.value == eventObject.fee) {
            events.updateOne({url: event}, { $addToSet: { attendees: user } });
          }
        }
        const payment = { referenceCode, pull, push };
        paymentList.push(payment);
        counter ++;
      } while (true);
      paymentList.reverse();
      res.json(paymentList);
    });

  const pushPayment = async referenceCode => {
    const payment = await payments.findOne({
      'body.reference_sale': referenceCode,
    });
    if (!payment) return null;
    const { body } = payment;
    const result = {
      requestDate: new Date(body.transaction_date),
      responseDate: new Date(payment.metadata.date),
      value: body.value,
      currency: body.currency,
      status: body.response_message_pol,
      error: body.error_message_bank,
    };
    return result;
  }

  const pullPayment = async referenceCode => {
    const object = {
      test: true,
      command: 'ORDER_DETAIL_BY_REFERENCE_CODE',
      merchant: { apiLogin: payULogin, apiKey: payUKey },
      details: { referenceCode },
      language: 'es',
    };
    const body = JSON.stringify(object);
    const method  = 'post';
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    const response = await fetch(payUReports, { body, method, headers });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.result === null || data.result.payload === null) {
      return null;
    }
    const payload = data.result.payload[0];
    const txValue = payload.additionalValues.TX_VALUE;
    const transaction = payload.transactions[0];
    const result = {
      status: transaction.transactionResponse.state,
      response: transaction.transactionResponse.responseCode,
      requestDate: new Date(payload.creationDate),
      value: txValue.value,
      currency: txValue.currency,
      receipt: transaction.extraParameters.URL_PAYMENT_RECEIPT_HTML,
    };
    return result;
  };

  app.post('/payu/hash', async (req, res, next) => { try {
    const params = {
      merchantId: isNumber,
      referenceCode: isStringLongerThan(45),
      amount: isNumber,
      currency: isCurrencyCode,
    };
    await checkParams(params, req);
    const { merchantId, referenceCode, amount, currency } = req.body;
    const payload = `${payUKey}~${merchantId}~${referenceCode}~${amount}`
          + `~${currency}`;
    const hash = crypto.createHash('sha256');
    hash.update(payload);
    const digest = hash.digest('hex');
    res.json(digest);
    } catch (err) { handleError(err, next) }});

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

  app.put('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => { try {
    const { address } = req.params;
    await checkSignature(address, req);
    const params = {
      email: isEmail,
    };
    await checkOptionalParams(params, req);
    await checkUserExists(users, address);
    const { email } = req.body;
    if (email) {
      const result = await users.updateOne({ address }, { $set: { email }});
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
    const sortedUsers = userFilter.sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedUsers);
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
      name,
      url,
      description,
      fee,
      start,
      end,
      beforeStart,
      afterEnd,
      organizer,
      signature,
    } = req.body;
    if (
      name === ''
        || !/^[a-z1-9-]{1}[a-z0-9-]{0,59}$/.test(url)
        || description === ''
        || isNaN(Number(fee))
        || isNaN(new Date(start).getTime())
        || isNaN(new Date(end).getTime())
        || isNaN(new Date(beforeStart).getTime())
        || isNaN(new Date(afterEnd).getTime())
        || !utils.isAddress(organizer)
        || !/^0x[0-9a-f]+$/.test(signature)
    ) {
      res.status(400).json('wrong param values');
      console.error(req.body);
      return;
    }
    const object = {
      name,
      url,
      description,
      fee,
      start,
      end,
      beforeStart,
      afterEnd,
      organizer,
    };
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
    const attendees = [];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const event = {
      name,
      url,
      description,
      fee: feeAmount,
      start: startDate,
      end: endDate,
      beforeStart: beforeStartDate,
      afterEnd: afterEndDate,
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

  app.post('/attend', async (req, res, next) => { try {
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
    if (eventObject.fee != 0) {
      throw new HttpError(400, PAID_EVENT);
    }
    const now = new Date();
    if (now > eventObject.afterEnd) {
      res.status(400).json('the event already finished');
      console.error(eventObject);
      return;
    }
    if (!eventObject.attendees.includes(attendee)) {
      const effect = await events.updateOne({url: event}, {
        $push: {attendees: attendee}
      });
      if (effect.result.ok && effect.modifiedCount === 1) {
        res.status(201).json('');
        return;
      } else {
        res.status(500).end();
        console.error(effect);
        return;
      }
    }
    res.end();
  } catch (err) { handleError(err, next) }});

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
    const now = new Date();
    if (now < eventObject.beforeStart) {
      res.status(400).json('the event hasn\'t started');
      console.error(eventObject);
      return;
    }
    const object = req.body;
    object.date = now;
    object.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
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

});

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

const MALFORMED_SIGNATURE = 'malformed-signature';
const UNAUTHORIZED = 'unauthorized';
const INSUFFICIENT_PARAMS = 'insufficient-params';
const WRONG_PARAM_VALUES = 'wrong-param-values';
const USER_NONEXISTENT = 'user-nonexistent';
const PAID_EVENT = 'paid-event';

const isNumber = value => !isNaN(value);
const isString = value => value !== '';
const isStringLongerThan = length => value => value.length > length;
const isCurrencyCode = value => value.length === 3;
const isEmail = value =>
      value.length < 255
      && value.length > 5
      && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

const checkSignature = async (expectedSigner, req) => {
  const { signature, ...object } = req.body;
  if (!Object.keys(object).length) {
    throw new HttpError(400, INSUFFICIENT_PARAMS);
  }
  if (!/^0x[0-9a-f]+$/.test(signature)) {
    throw new HttpError(401, MALFORMED_SIGNATURE);
  }
  const payload = JSON.stringify(object);
  const hexPayload = utils.utf8ToHex(payload);
  let actualSigner;
  try {
    actualSigner = accounts.recover(hexPayload, signature);
  } catch (err) {
    throw new HttpError(401, MALFORMED_SIGNATURE);
  }
  if (expectedSigner !== actualSigner) {
    throw new HttpError(403, UNAUTHORIZED);
  }
}

const checkParams = async (expected, req) => {
  const actual = req.body;
  const expectedNames = Object.keys(expected);
  const actualNames = Object.keys(actual);
  if (!expectedNames.every(name => actualNames.includes(name))) {
    throw new HttpError(400, INSUFFICIENT_PARAMS);
  }
  for (const name in expected) {
    const test = expected[name];
    const actualValue = actual[name];
    if (!test(actualValue)) {
      throw new HttpError(400, WRONG_PARAM_VALUES);
    }
  }
}

const checkOptionalParams = async (expected, req) => {
  const actual = req.body;
  let count = 0;
  for (const name in expected) {
    if (name in actual) {
      count ++;
      const test = expected[name];
      const actualValue = actual[name];
      if (!test(actualValue)) {
        throw new HttpError(400, WRONG_PARAM_VALUES);
      }
    }
  }
  if (!count) {
    throw new HttpError(400, INSUFFICIENT_PARAMS);
  }
}

const checkUserExists = async (users, address) => {
  const count = await users.countDocuments({ address });
  if (count === 0) {
    throw new HttpError(400, USER_NONEXISTENT);
  }
}

const handleError = (err, next) => {
  if (err.name === 'HttpError') {
    next(err);
  }
  else {
    next(new Error());
    console.error(err);
  }
}

app.listen(port);
