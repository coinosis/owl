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
  states,
  checkParams,
  isPositiveNumber,
  isStringLongerThan,
  isCurrencyCode,
} = require('./control.js');
const web3 = require('./web3.js');
const { registerFor } = require('./eth.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const payULogin = process.env.PAYU_LOGIN || 'pRRXKOl8ikMmt9u';
const payUKey = process.env.PAYU_KEY || '4Vj8eK4rloUd272L48hsrarnUA';

const APPROVED_ID = 4;
const APPROVED = 'APPROVED';
const DECLINED = 'DECLINED';
const PENDING = 'PENDING';
const USD = 'USD';
const ETH = 'xDAI';
const REGISTER = 'register';

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

const setTxError = (errorInfo, element, message) => {
  const { event, user } = errorInfo;
  db.transactions.updateOne(
    { event, user },
    { $push: { [element]: { message, state: states.NOT_SENT } } },
    { upsert: true },
  );
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
  const { event, user } = processReferenceCode(referenceCode);
  const pushPayment = {
    referenceCode,
    date,
    amount,
    currency,
    state: state == APPROVED_ID ? APPROVED: DECLINED,
  };
  db.transactions.updateOne(
    { event, user },
    { $push: { push: pushPayment } },
    { upsert: true },
  );
  return { event, user, pushPayment };
};

const processPayment = async ({
  event: eventURL,
  user: userAddress,
  pushPayment,
}) => {
  const { referenceCode, amount, currency, state } = pushPayment;
  const errorInfo = { event: eventURL, user: userAddress };
  if (state !== APPROVED) {
    setTxError(errorInfo, REGISTER, errors.PAYMENT_NOT_APPROVED);
    throw new InternalError(errors.PAYMENT_NOT_APPROVED, state);
  }
  if (currency !== USD) {
    setTxError(errorInfo, REGISTER, errors.INVALID_CURRENCY);
    throw new InternalError(errors.INVALID_CURRENCY, currency);
  }
  const transaction = await db.transactions.findOne({
    event: eventURL,
    user: userAddress,
    'register.referenceCode': referenceCode,
  });
  if (transaction) {
    setTxError(errorInfo, REGISTER, errors.PAYMENT_ALREADY_PROCESSED);
    throw new InternalError(errors.PAYMENT_ALREADY_PROCESSED, transaction);
  }
  const event = await db.events.findOne({ url: eventURL });
  if (event === null) {
    setTxError(errorInfo, REGISTER, errors.EVENT_NONEXISTENT);
    throw new InternalError(errors.EVENT_NONEXISTENT, eventURL);
  }
  const { feeWei, address: contractAddress } = event;
  const amountWei = web3.utils.toWei(amount);
  const correctPushFee = checkFee({ expected: feeWei, actual: amountWei });
  if (!correctPushFee) {
    setTxError(errorInfo, REGISTER, errors.INVALID_FEE);
    throw new InternalError(errors.INVALID_FEE, { feeWei, amountWei });
  }
  const pullPayment = await paymentFetcher(referenceCode);
  if (pullPayment === null) {
    setTxError(errorInfo, REGISTER, errors.PAYMENT_NONEXISTENT);
    throw new InternalError(errors.PAYMENT_NONEXISTENT, referenceCode);
  }
  if (pullPayment.state !== APPROVED
      || pullPayment.currency !== USD
      || Number(pullPayment.amount) != Number(amount)
     ) {
    setTxError(errorInfo, REGISTER, errors.INVALID_PAYMENT);
    throw new InternalError(errors.INVALID_PAYMENT, pullPayment, pushPayment);
  }
  const result = await registerFor(contractAddress, userAddress, feeWei);
  const register = {
    ...result,
    referenceCode,
    date: new Date(),
    amount: web3.utils.fromWei(amountWei),
    currency: ETH,
  };
  db.transactions.updateOne(
    { event: eventURL, user: userAddress },
    { $push: { register: register } },
    { upsert: true },
  );
}

const paymentFetcher = async referenceCode => {
  let attempts = 1;
  let payment = await fetchPayment(referenceCode);
  while(
    (payment === null || payment.state === PENDING)
      && attempts < pullAttempts
  ) {
    await sleep(pullInterval);
    attempts ++;
    console.log(`attempt # ${attempts}`);
    payment = await fetchPayment(referenceCode);
    console.log(payment);
  }
  return payment;
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
    amount: String(txValue.value),
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

const updateTransaction = async (event, user) => {
  let initialCounter;
  let isPending = false;
  const storedTransaction = await db.transactions.findOne({ event, user });
  if (!storedTransaction || !storedTransaction.pull) {
    initialCounter = 0;
  } else {
    const { pull } = storedTransaction;
    const latestStoredPayment = pull[pull.length - 1];
    const { counter } = processReferenceCode(latestStoredPayment.referenceCode);
    if (latestStoredPayment.state === PENDING) {
      initialCounter = counter;
      isPending = true;
    } else {
      initialCounter = counter + 1;
    }
  }
  let latestPayments = await findLatestPayments(event, user, initialCounter);
  if (isPending) {
    const [ pendingPayment ] = latestPayments.splice(0, 1);
    await db.transactions.updateOne(
      { event, user },
      { $set: { ['pull.' + initialCounter]: pendingPayment } },
    );
  }
  if (!latestPayments.length) return;
  await db.transactions.updateOne(
    { event, user },
    { $push: { pull: { $each: latestPayments } } },
    { upsert: true },
  );
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
  updateTransaction,
  getHash,
  getHashableAmount,
  checkFee,
  sleep,
  paymentFetcher,
  setClosable,
  getClosable,
}
