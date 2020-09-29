const fetch = require('node-fetch');
const {
  tokenEndpoint,
  clientID,
  clientSecret,
  ordersEndpoint,
} = require('./settings.js').paypal;
const { HttpError, errors, states, } = require('./control');
const dbModule = require('./db.js');
const web3 = require('./web3.js');
const { registerFor } = require('./eth.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const getToken = async () => {
  const auth = `${clientID}:${clientSecret}`;
  const authBuffer = Buffer.from(auth);
  const auth64 = authBuffer.toString('base64');
  const response = await fetch(tokenEndpoint, {
    method: 'post',
    headers: {
      Authorization: `Basic ${auth64}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE, {
      error: await response.json()
    });
  }
  const data = await response.json();
  const { access_token: token } = data;
  return token;
}

const postOrder = async (eventURL, user, locale, baseURL) => {
  const event = await db.events.findOne({ url: eventURL, });
  const { feeWei } = event;
  const feeUSD = Number(web3.utils.fromWei(feeWei)).toFixed(2);
  const token = await getToken();
  const returnURL = `${ baseURL }/paypal/close`;
  const response = await fetch(ordersEndpoint, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [ { amount: {
        currency_code: 'USD',
        value: feeUSD,
      } } ],
      application_context: {
        brand_name: 'coinosis',
        locale,
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnURL,
        cancel_url: returnURL,
      },
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE, {
      error,
      details: error.details[0],
      links: error.links[0],
    });
  }
  const data = await response.json();
  const referenceCode = data.id;
  const payment = {
    referenceCode,
    date: new Date(),
    amount: feeUSD,
    currency: 'USD',
    state: states.CREATED
  };
  const key = `paypal.${ referenceCode }`;
  db.transactions.updateOne(
    { event: eventURL, user, },
    { $set: { [ key ]: payment, }, },
    { upsert: true, }
  );
  const approveLink = data.links.find(link => link.rel === 'approve');
  return { referenceCode, approveURL: approveLink.href, };
}

const updateState = async referenceCode => {
  const token = await getToken();
  const response = await fetch(`${ ordersEndpoint }/${ referenceCode }`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${ token }`,
    },
  });
  const data = await response.json();
  const { status: state, } = data;
  const key = `paypal.${ referenceCode }`;
  const stateKey = `${ key }.state`;
  db.transactions.updateOne(
    { [ key ]: { $exists: true }},
    { $set: { [ stateKey ]: state }}
  );
  if (state === states.APPROVED) {
    const tx = await db.transactions.findOne({[ key ]: {$exists: true}});
    const { user, event: eventURL, } = tx;
    const event = await db.events.findOne({ url: eventURL, });
    const result = await registerFor(event.address, user, event.feeWei);
    const register = {
      ...result,
      referenceCode,
      date: new Date(),
      amount: web3.utils.fromWei(event.feeWei),
      currency: 'ETH',
    };
    db.transactions.updateOne(
      { event: eventURL, user, },
      { $push: { register: register, }, },
      { upsert: true, }
    );
  }
}

const closeOrder = async referenceCode => {
  updateState(referenceCode);
}

module.exports = { initialize, postOrder, closeOrder, };
