const express = require('express');
const cors = require('cors');
const dbModule = require('./db.js');
const { handleError, closeTab, } = require('./control.js');
const eth = require('./eth.js');
const payu = require('./payu.js');
const users = require('./users.js');
const events = require('./events.js');
const series = require('./series.js');
const distributions = require('./distributions.js');
const assessments = require('./assessments.js');
const paypal = require('./paypal.js');

const port = process.env.PORT || 3000;

let db;
const initialize = async () => {
  await dbModule.connect();
  payu.initialize();
  paypal.initialize();
  users.initialize();
  events.initialize();
  series.initialize();
  distributions.initialize();
  assessments.initialize();
  eth.initialize();
  db = dbModule.getCollections();
}
initialize();

const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/', (req, res) => {
  res.json('KQfvp');
});

app.get('/eth/price', async (req, res, next) => {
  try {
    const price = await eth.getETHPrice();
    res.json(price);
  } catch (err) {
    handleError(err, next)
  }
});

app.get('/eth/gas', async (req, res, next) => {
  try {
    const price = await eth.getGasPrice();
    res.json(price);
  } catch (err) {
    handleError(err, next)
  }
});

app.post('/payu', async (req, res, next) => {
  try {
    const transaction = await payu.paymentReceived(req);
    res.status(200).end();
    await payu.processPayment(transaction);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/close', (req, res, next) => {
  try {
    const { referenceCode, lng, } = req.query;
    res.send(closeTab(lng));
    payu.setClosable(referenceCode);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/closable/:referenceCode', async (req, res, next) => {
  try {
    const { referenceCode } = req.params;
    const closable = await payu.getClosable(referenceCode);
    res.json(closable);
  } catch (err) {
    handleError(err, next);
  }
});

app.get(
  '/tx/:event([a-z0-9-]{1,60})/:user(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, user } = req.params;
      await payu.updateTransaction(event, user);
      await eth.updateTransaction(event, user);
      const transaction = await db.transactions.findOne({ event, user, });
      res.json(transaction);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/payu/hash', async (req, res, next) => {
  try {
    const { body } = req;
    const hash = await payu.getHash(body);
    res.json(hash);
  } catch (err) {
    handleError(err, next)
  }
});

app.get('/users', async (req, res, next) => {
  try {
    const userList = await users.getUsers();
    res.json(userList);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => {
  try {
    const { address } = req.params;
    const user = await users.getUser(address);
    res.json(user);
  } catch (err) {
    handleError(err, next);
  }
});

app.put('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => {
  try {
    const user = await users.putUser(req);
    res.json(user);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/users', async (req, res, next) => {
  try {
    const result = await users.postUser(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/events', async (req, res, next) => {
  try {
    const eventList = await events.getEvents();
    res.json(eventList);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/event/:url([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { url } = req.params;
    const event = await events.getEvent(url);
    res.json(event);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/event/:url([a-z0-9-]{1,60})/attendees', async (req, res, next) => {
  try {
    const { url } = req.params;
    const attendees = await events.getAttendees(url);
    res.json(attendees);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/series', async (req, res, next) => {
  try {
    const seriesList = await series.getSeries();
    res.json(seriesList);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/series/:url([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { url } = req.params;
    const aSeries = await series.getASeries(url);
    res.json(aSeries);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/series', async (req, res, next) => {
  try {
    const result = await series.postSeries(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/events', async (req, res, next) => {
  try {
    const result = await events.postEvent(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/attend', async (req, res, next) => {
  try {
    await events.attend(req);
    res.status(200).end();
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const distribution = await distributions.getDistribution(event);
    res.json(distribution);
  } catch (err) {
    handleError(err, next);
  }
});

app.put('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    await distributions.putDistribution(event);
    res.status(201).end();
  } catch (err) {
    handleError(err, next);
  }
});

app.get(
  '/claps/:event([a-z0-9-]{1,60})/:clapee(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, clapee, } = req.params;
      const claps = await assessments.getClaps(event, clapee);
      res.json(claps);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/clap', (req, res) => {
  try {
    res.status(200).end();
    const body = JSON.parse(req.body);
    assessments.clap(body);
  } catch (err) {
    console.error({
      endpoint: 'clap',
      request: req.body,
      message: err.message
    });
  }
});

app.get('/assessments/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const assessmentList = await assessments.getAssessments(event);
    res.json(assessmentList);
  } catch (err) {
    handleError(err, next);
  }
});

app.get(
  '/assessment/:event([a-z0-9-]{1,60})/:sender(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, sender } = req.params;
      const assessment = await assessments.getAssessment(event, sender);
      res.json(assessment);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/assessments', async (req, res, next) => {
  try {
    const result = await assessments.postAssessment(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/paypal/orders', async (req, res, next) => {
  try {
    const host = req.get('host');
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const baseURL = `${protocol}://${ host }`;
    const { event, user, value, locale, } = req.body;
    const approveURL = await paypal.postOrder(
      event,
      user,
      value,
      locale,
      baseURL
    );
    res.json(approveURL);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/paypal/close', async (req, res, next) => {
  try {
    const { token: referenceCode } = req.query;
    await paypal.closeOrder(referenceCode);
    res.send(closeTab());
  } catch (err) {
    handleError(err, next);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json(err.message);
});

app.listen(port);
