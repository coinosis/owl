const fetch = require('node-fetch');
const crypto = require('crypto');
const util = require('util');
const dbModule = require('./db.js');
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

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

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

const createReferenceCode = (event, user, counter) => {
  const referenceCode = `${event}:${user}:${counter}:${environmentId}`;
  return referenceCode;
}

const processReferenceCode = referenceCode => {
  const [ event, user, counter ] = referenceCode.split(':');
  return { event, user, counter: Number(counter) };
}

const setClosable = referenceCode => {
  db.closable.insertOne({ referenceCode });
}

const getClosable = async referenceCode => {
  const closable = await db.closable.findOne({ referenceCode });
  return closable != null;
}

const paymentReceived = async req => {
  const date = new Date();
  const params = {
    sign: isStringLongerThan(60),
    reference_sale: isStringLongerThan(45),
    value: isPositiveNumber,
    currency: isCurrencyCode,
    state_pol: isPositiveNumber,
  };
  const { body } = req;
  await checkParams(params, body);
  const {
    sign: actualHash,
    reference_sale: referenceCode,
    value: amount,
    currency,
    state_pol: state,
  } = body;
  const hashableAmount = getHashableAmount(amount);
  const expectedHash = await getHash({
    referenceCode,
    amount: hashableAmount,
    currency,
    state,
  });
  if (actualHash !== expectedHash) {
    throw new HttpError(401, errors.UNAUTHORIZED, { actualHash, expectedHash });
  }
  // delete from here
  delete req.headers['http.useragent'];
  db.payments.insertOne({
    body,
    metadata: {
      date: new Date(),
      ip: req.connection.remoteAddress,
      reference: body.reference_sale,
    },
    headers: req.headers,
  });
  // to here
  const { event, user } = processReferenceCode(referenceCode);
  const push = {
    referenceCode,
    date,
    amount,
    currency,
    state,
    message: body.response_message_pol,
  };
  db.transactions.updateOne(
    { event, user },
    { $push: { push: push } },
    { upsert: true },
  );
  return { event, user, referenceCode, push };
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
    date: new Date(),
    referenceCode,
    feeETH,
    ethPrice,
    amountPaid: amount,
    currency,
    ...result,
  };
  db.transactions.insertOne(transaction);
}

// delete this function
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

const fetchPayment = async referenceCode => {
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
    referenceCode,
    date: new Date(payload.creationDate),
    amount: txValue.value,
    currency: txValue.currency,
    state: transaction.transactionResponse.state,
    message: transaction.transactionResponse.responseCode,
    method: transaction.paymentMethod,
    receipt: extraParameters ? extraParameters.URL_PAYMENT_RECEIPT_HTML : '',
  };
  return result;
};

const findLatestPayments = async (event, user, initialCounter) => {
  const latestPayments = [];
  let counter = initialCounter;
  let potentialPayment;
  do {
    const referenceCode = createReferenceCode(event, user, counter);
    potentialPayment = await fetchPayment(referenceCode);
    if (potentialPayment == null) break;
    latestPayments.push(potentialPayment);
    counter ++;
  } while (true);
  return latestPayments;
};

const getTransaction = async (event, user) => {
  let initialCounter;
  const storedTransaction = await db.transactions.findOne({ event, user });
  if (!storedTransaction || !storedTransaction.pull) {
    initialCounter = 1;
  } else {
    const { pull } = storedTransaction;
    const latestStoredPayment = pull[pull.length - 1];
    const { counter } = processReferenceCode(latestStoredPayment.referenceCode);
    initialCounter = counter + 1;
  }
  const latestPayments = await findLatestPayments(event, user, initialCounter);
  if (!latestPayments.length) {
    return storedTransaction;
  }
  await db.transactions.updateOne(
    { event, user },
    { $push: { pull: { $each: latestPayments } } },
    { upsert: true },
  );
  const updatedTransaction = await db.transactions.findOne({ event, user });
  return updatedTransaction;
}

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
  initialize,
  paymentReceived,
  processPayment,
  fetchPayment,
  findLatestPayments,
  getTransaction,
  getHash,
  pushPayment,
  getHashableAmount,
  checkFee,
  sleep,
  awaitPullPayment,
  setClosable,
  getClosable,
}
