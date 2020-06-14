const web3 = require('./web3.js');
const db = require('./db.js');

const errors = {
  MALFORMED_SIGNATURE: 'malformed-signature',
  UNAUTHORIZED: 'unauthorized',
  INSUFFICIENT_PARAMS: 'insufficient-params',
  WRONG_PARAM_VALUES: 'wrong-param-values',
  USER_NONEXISTENT: 'user-nonexistent',
  USER_EXISTS: 'user-exists',
  PAID_EVENT: 'paid-event',
  SERVICE_UNAVAILABLE: 'service-unavailable',
  NOT_FOUND: 'not-found',
  ADDRESS_EXISTS: 'address-exists',
  DISTRIBUTION_EXISTS: 'distribution-exists',
  EVENT_NONEXISTENT: 'event-nonexistent',
  EVENT_EXISTS: 'event-exists',
  DISTRIBUTION_NONEXISTENT: 'distribution-nonexistent',
  INVALID_FEE: 'invalid-fee',
  INVALID_DATE: 'invalid-date',
  ASSESSMENT_NONEXISTENT: 'assessment-nonexistent',
}

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

const handleError = (err, next) => {
  if (err.name === 'HttpError') {
    next(err);
  }
  else {
    next(new Error());
    console.error(err);
  }
}

const isNumber = value => !isNaN(value);
const isString = value => value !== '';
const isStringLongerThan = length => value => value.length > length;
const isCurrencyCode = value => value.length === 3;
const isEmail = value =>
      value.length < 255
      && value.length > 5
      && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
const isTelegram = value => /^@[a-zA-Z0-9_]{5,32}$/.test(value);

const checkSignature = async (expectedSigner, req) => {
  const { signature, ...object } = req.body;
  if (!Object.keys(object).length) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
  if (!/^0x[0-9a-f]+$/.test(signature)) {
    throw new HttpError(401, errors.MALFORMED_SIGNATURE);
  }
  const payload = JSON.stringify(object);
  const hexPayload = web3.utils.utf8ToHex(payload);
  let actualSigner;
  try {
    actualSigner = web3.eth.accounts.recover(hexPayload, signature);
  } catch (err) {
    throw new HttpError(401, errors.MALFORMED_SIGNATURE);
  }
  if (expectedSigner !== actualSigner) {
    throw new HttpError(403, errors.UNAUTHORIZED);
  }
}

const checkParams = async (expected, req) => {
  const actual = req.body;
  const expectedNames = Object.keys(expected);
  const actualNames = Object.keys(actual);
  if (!expectedNames.every(name => actualNames.includes(name))) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
  for (const name in expected) {
    const test = expected[name];
    const actualValue = actual[name];
    if (!test(actualValue)) {
      throw new HttpError(400, errors.WRONG_PARAM_VALUES);
    }
  }
}

const checkOptionalParams = async (expected, req) => {
  const actual = req.body;
  let count = 0;
  for (const name in expected) {
    if (name in actual) {
      count ++;
      const test = expected[name];
      const actualValue = actual[name];
      if (!test(actualValue)) {
        throw new HttpError(400, errors.WRONG_PARAM_VALUES);
      }
    }
  }
  if (!count) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
}

const checkUserExists = async address => {
  const count = await db.users.countDocuments({ address });
  if (count === 0) {
    throw new HttpError(400, errors.USER_NONEXISTENT);
  }
}

module.exports = {
  HttpError,
  handleError,
  errors,
  checkParams,
  checkOptionalParams,
  checkSignature,
  checkUserExists,
  isEmail,
  isTelegram,
  isNumber,
  isStringLongerThan,
  isCurrencyCode,
}
