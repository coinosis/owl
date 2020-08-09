const express = require('express');
const cors = require('cors');
const dbModule = require('./db.js');
const { handleError } = require('./control.js');
const eth = require('./eth.js');
const payu = require('./payu.js');
const users = require('./users.js');
const events = require('./events.js');
const distributions = require('./distributions.js');
const assessments = require('./assessments.js');

const port = process.env.PORT || 3000;

const initialize = async () => {
  await dbModule.connect();
  payu.initialize();
  users.initialize();
  events.initialize();
  distributions.initialize();
  assessments.initialize();
}
initialize();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
eth.initializeNonce();

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
    res.send("cierra esta pestaña para regresar a coinosis.");
    const { referenceCode } = req.query;
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
  '/payu/:event([a-z0-9-]{1,60})/:user(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, user } = req.params;
      const transaction = await payu.getTransaction(event, user);
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

app.post('/events', async (req, res, next) => {
  try {
    const result = await events.postEvent(req);
    res.status(201).json(result);
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

app.use((err, req, res, next) => {
  res.status(err.status || 500).json(err.message);
});

app.listen(port);
