const {
  HttpError,
  errors,
  checkOptionalParams,
  checkParams,
  checkSignature,
  isEmail,
  isTelegram,
  isString,
  isAddress,
} = require('./control.js');
const dbModule = require('./db.js');
const web3 = require('./web3.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const checkUserExists = async address => {
  const count = await db.users.countDocuments({ address });
  if (count === 0) {
    throw new HttpError(400, errors.USER_NONEXISTENT);
  }
}

const getUsers = async () => {
  const users = await db.users.find().toArray();
  return users;
}

const getUser = async address => {
  const checksumAddress = web3.utils.toChecksumAddress(address);
  const user = await db.users.findOne({ address: checksumAddress, });
  if (!user) {
    throw new HttpError(404, errors.USER_NONEXISTENT);
  }
  return user;
}

const putUser = async req => {
  const { address } = req.params;
  await checkSignature(address, req);
  const params = {
    email: isEmail,
    telegram: isTelegram,
  };
  await checkOptionalParams(params, req);
  await checkUserExists(address);
  const { email, telegram } = req.body;
  if (email) {
    await db.users.updateOne({ address }, { $set: { email }});
  }
  if (telegram) {
    await db.users.updateOne({ address }, { $set: { telegram }});
  }
  const user = await db.users.findOne({ address });
  return user;
}

const postUser = async req => {
  const expectedParams = {
    name: isString,
    address: isAddress,
  };
  await checkParams(expectedParams, req.body);
  const { name, address, } = req.body;
  await checkSignature(address, req);
  const nameCount = await db.users.countDocuments({ name, });
  if (nameCount > 0) {
    throw new HttpError(400, errors.USER_EXISTS, { name, });
  }
  const addressCount = await db.users.countDocuments({ address, });
  if (addressCount > 0) {
    throw new HttpError(400, errors.USER_EXISTS, { address, });
  }
  const effect = await db.users.insertOne({ name, address, });
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE, { effect });
  }
}

module.exports = { initialize, getUsers, getUser, putUser, postUser, };
