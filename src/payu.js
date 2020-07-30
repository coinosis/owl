const fetch = require('node-fetch');
const crypto = require('crypto');
const util = require('util');
const db = require('./db.js');
const {
  payUReports,
  environmentId,
  merchantId,
  feeThreshold,
  pullAttempts,
  pullInterval,
} = require('./settings.js');
const {
  HttpError,
  InternalError,
  errors,
  checkParams,
  isPositiveNumber,
  isStringLongerThan,
  isCurrencyCode,
} = require('./control.js');
const web3 = require('./web3.js');
const { getETHPrice, registerFor, usdToWei } = require('./eth.js');

const payULogin = process.env.PAYU_LOGIN || 'pRRXKOl8ikMmt9u';
const payUKey = process.env.PAYU_KEY || '4Vj8eK4rloUd272L48hsrarnUA';

const APPROVED = 4;
const USD = 'USD';

const sleep = util.promisify(setTimeout);

const checkFee = ({ expected, actual }) => {
  const minExpectedFee = expected * feeThreshold;
  return actual >= minExpectedFee;
}

const getHashableAmount = amount => {
  const matches = amount.match('(\\d+\\.?\\d?)(\\d?)');
  const baseAmount = matches[1];
  const secondDigit = matches[2];
  if (secondDigit == 0) {
    return baseAmount;
  } else {
    return `${baseAmount}${secondDigit}`;
  }
}

const setClosable = referenceCode => {
  db.closable.insertOne({ referenceCode });
}

const getClosable = async referenceCode => {
  const closable = await db.closable.findOne({ referenceCode });
  return closable != null;
}

const paymentReceived = async req => {
  const params = {
    sign: isStringLongerThan(60),
    reference_sale: isStringLongerThan(45),
    value: isPositiveNumber,
    currency: isCurrencyCode,
    state_pol: isPositiveNumber,
  };
  await checkParams(params, req.body);
  const {
    sign: actualHash,
    reference_sale: referenceCode,
    value,
    currency,
    state_pol: state,
  } = req.body;
  const amount = value.substring(0, 20);
  const hashableAmount = getHashableAmount(amount);
  const expectedHash = await getHash({
    referenceCode,
    amount: hashableAmount,
    currency,
    state,
  });
  if (actualHash !== expectedHash) {
    console.error({ actualHash, expectedHash });
    throw new HttpError(401, errors.UNAUTHORIZED);
  }
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
  return { state, referenceCode, amount, currency };
};

const awaitPullPayment = async referenceCode => {
  let attempts = 1;
  let pull = await pullPayment(referenceCode);
  while(pull === null && attempts < pullAttempts) {
    attempts++;
    await sleep(pullInterval);
    console.log(`attempt # ${attempts}`);
    pull = await pullPayment(referenceCode);
    console.log(pull);
  }
  return pull;
}

const processPayment = async ({ state, referenceCode, amount, currency }) => {
  if (state != APPROVED) throw new InternalError(errors.PAYMENT_NOT_APPROVED);
  if (currency !== USD) throw new InternalError(errors.INVALID_CURRENCY);
  const txCount = await db.transactions.countDocuments({ referenceCode });
  if (txCount > 0) throw new InternalError(errors.PAYMENT_ALREADY_PROCESSED);
  const [ eventURL, userAddress ] = referenceCode.split(':');
  const event = await db.events.findOne({ url: eventURL });
  if (event === null) throw new InternalError(errors.EVENT_NONEXISTENT);
  const { feeWei, address: contractAddress } = event;
  const ethPrice = await getETHPrice();
  const amountWei = await usdToWei(amount);
  const correctPushFee = checkFee({ expected: feeWei, actual: amountWei });
  if (!correctPushFee) {
    throw new InternalError(errors.INVALID_FEE, { feeWei, amountWei });
  }
  const pullPayment = await awaitPullPayment(referenceCode);
  if (pullPayment === null) {
    throw new InternalError(errors.PAYMENT_NONEXISTENT);
  }
  const { status, currency: pullCurrency, value: pullAmount } = pullPayment;
  if (status !== 'APPROVED' || pullCurrency !== USD || pullAmount != amount) {
    throw new InternalError(errors.INVALID_PAYMENT);
  }
  const result = await registerFor(contractAddress, userAddress, feeWei);
  const feeETH = web3.utils.fromWei(feeWei);
  const transaction = {
    referenceCode,
    feeETH,
    ethPrice,
    amountPaid: amount,
    currency,
    ...result,
  };
  db.transactions.insertOne(transaction);
}

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
    const transaction = await db.transactions.findOne({ referenceCode });
    if (pull === null && push === null) break;
    const payment = { referenceCode, pull, push, transaction };
    paymentList.push(payment);
    counter ++;
  } while (true);
  paymentList.reverse();
  return paymentList;
};

const getHash = async ({ referenceCode, amount, currency, state }) => {
  const params = {
    referenceCode: isStringLongerThan(45),
    amount: isPositiveNumber,
    currency: isCurrencyCode,
  };
  await checkParams(params, { referenceCode, amount, currency });
  const payloadBase = `${payUKey}~${merchantId}~${referenceCode}~${amount}`
        + `~${currency}`;
  const payload = state ? `${payloadBase}~${state}` : payloadBase;
  const hash = crypto.createHash('sha256');
  hash.update(payload);
  const digest = hash.digest('hex');
  return digest;
};

module.exports = {
  paymentReceived,
  processPayment,
  getPayments,
  getHash,
  pushPayment,
  pullPayment,
  getHashableAmount,
  checkFee,
  sleep,
  awaitPullPayment,
  setClosable,
  getClosable,
}
