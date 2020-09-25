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

const postOrder = async (value, locale, baseURL) => {
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
        value,
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
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE, {
      error: await response.json()
    });
  }
  const data = await response.json();
  const approveLink = data.links.find(link => link.rel === 'approve');
  return approveLink.href;
}

module.exports = { postOrder, };
