const fetch = require('node-fetch');
const crypto = require('crypto');
const db = require('./db.js');
const { payUReports, environmentId } = require('./settings.js');
const {
  HttpError,
  errors,
  checkParams,
  isNumber,
  isStringLongerThan,
  isCurrencyCode,
} = require('./control.js');
const web3 = require('./web3.js');
const { getETHPrice, registerFor } = require('./eth.js');

const payULogin = process.env.PAYU_LOGIN || 'pRRXKOl8ikMmt9u';
const payUKey = process.env.PAYU_KEY || '4Vj8eK4rloUd272L48hsrarnUA';

const paymentReceived = req => {
  delete req.headers['http.useragent'];
  db.payments.insertOne({
    body: req.body,
    metadata: {
      date: new Date(),
      ip: req.connection.remoteAddress,
      reference: req.body.reference_sale,
    },
    headers: req.headers,
  });
};

const pushPayment = async referenceCode => {
  const payment = await db.payments.findOne({
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
  console.log({ apiLogin: payULogin, apiKey: payUKey });
  console.log(payUReports);
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
  if (data.code && data.code === 'ERROR') {
    console.error(data);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  if (data.result === null || data.result.payload === null) {
    return null;
  }
  const payload = data.result.payload[0];
  const txValue = payload.additionalValues.TX_VALUE;
  const transaction = payload.transactions[0];
  const extraParameters = transaction.extraParameters;
  const result = {
    status: transaction.transactionResponse.state,
    response: transaction.transactionResponse.responseCode,
    requestDate: new Date(payload.creationDate),
    value: txValue.value,
    currency: txValue.currency,
    receipt: extraParameters ? extraParameters.URL_PAYMENT_RECEIPT_HTML : '',
  };
  return result;
};

const getPayments = async (event, user) => {
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
      const ethPrice = await getETHPrice();
      const eventObject = await db.events.findOne({url: event});
      const feeWei = eventObject.feeWei;
      const feeETH = web3.utils.fromWei(feeWei);
      const fee = feeETH * ethPrice;
      const lowestFee = fee * 0.9;
      if (pull.value >= lowestFee && push.value >= lowestFee) {
        const result = await registerFor(
          eventObject.address,
          user,
          feeWei
        );
        console.log(result);
      }
    }
    const payment = { referenceCode, pull, push };
    paymentList.push(payment);
    counter ++;
  } while (true);
  paymentList.reverse();
  return paymentList;
};

const getHash = async req => {
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
  return digest;
};

module.exports = {
  paymentReceived,
  getPayments,
  getHash,
  pushPayment,
  pullPayment,
}
