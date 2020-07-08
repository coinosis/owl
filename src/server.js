const express = require('express');
const cors = require('cors');
const { handleError } = require('./control.js');
const { getETHPrice, getGasPrice } = require('./eth.js');
const {
  paymentReceived,
  getPayments,
  getHash,
  setClosable,
  getClosable,
} = require('./payu.js');
const { getUsers, getUser, putUser, postUser } = require('./users.js');
const { getEvents, getEvent, getAttendees, postEvent } = require('./events.js');
const { getDistribution, putDistribution } = require('./distributions.js');
const {
  getAssessments,
  getAssessment,
  postAssessment,
} = require('./assessments.js');

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/', (req, res) => {
  res.json('w9Ckt');
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

app.post('/payu', async (req, res, next) => {
  try {
    await paymentReceived(req);
    res.status(200).end();
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/close', (req, res, next) => {
  try {
    res.send("cierra esta pestaña para regresar a coinosis.");
    const { referenceCode } = req.query;
    setClosable(referenceCode);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/closable/:referenceCode', async (req, res, next) => {
  try {
    const { referenceCode } = req.params;
    const closable = await getClosable(referenceCode);
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
      const paymentList = await getPayments(event, user);
      res.json(paymentList);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/payu/hash', async (req, res, next) => {
  try {
    const { body } = req;
    const hash = await getHash(body);
    res.json(hash);
  } catch (err) {
    handleError(err, next)
  }
});

app.get('/users', async (req, res, next) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => {
  try {
    const { address } = req.params;
    const user = await getUser(address);
    res.json(user);
  } catch (err) {
    handleError(err, next);
  }
});

app.put('/user/:address(0x[a-fA-F0-9]{40})', async (req, res, next) => {
  try {
    const user = await putUser(req);
    res.json(user);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/users', async (req, res, next) => {
  try {
    const result = await postUser(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/events', async (req, res, next) => {
  try {
    const events = await getEvents();
    res.json(events);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/event/:url([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { url } = req.params;
    const event = await getEvent(url);
    res.json(event);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/event/:url([a-z0-9-]{1,60})/attendees', async (req, res, next) => {
  try {
    const { url } = req.params;
    const attendees = await getAttendees(url);
    res.json(attendees);
  } catch (err) {
    handleError(err, next);
  }
});

app.post('/events', async (req, res, next) => {
  try {
    const result = await postEvent(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const distribution = await getDistribution(event);
    res.json(distribution);
  } catch (err) {
    handleError(err, next);
  }
});

app.put('/distribution/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    await putDistribution(event);
    res.status(201).end();
  } catch (err) {
    handleError(err, next);
  }
});

app.get('/assessments/:event([a-z0-9-]{1,60})', async (req, res, next) => {
  try {
    const { event } = req.params;
    const assessments = await getAssessments(event);
    res.json(assessments);
  } catch (err) {
    handleError(err, next);
  }
});

app.get(
  '/assessment/:event([a-z0-9-]{1,60})/:sender(0x[a-fA-F0-9]{40})',
  async (req, res, next) => {
    try {
      const { event, sender } = req.params;
      const assessment = await getAssessment(event, sender);
      res.json(assessment);
    } catch (err) {
      handleError(err, next);
    }
  }
);

app.post('/assessments', async (req, res, next) => {
  try {
    const result = await postAssessment(req);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, next);
  }
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json(err.message);
});

app.listen(port);
