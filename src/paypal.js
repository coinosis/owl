const fetch = require('node-fetch');
const {
  tokenEndpoint,
  clientID,
  clientSecret,
  ordersEndpoint,
} = require('./settings.js').paypal;
const { HttpError, errors, } = require('./control');

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

const postOrder = async value => {
  const token = await getToken();
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
        value,
      } } ],
    }),
  });
  if (!response.ok) {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE, {
      error: await response.json()
    });
  }
  const data = await response.json();
  console.log(data);
}

module.exports = { postOrder, };
