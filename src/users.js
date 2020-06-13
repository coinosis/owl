const {
  HttpError,
  errors,
  checkOptionalParams,
  checkUserExists,
  checkSignature,
  isEmail,
  isTelegram,
} = require('./control.js');
const db = require('./db.js');
const { web3 } = require('./web3.js');

const getUsers = async () => {
  const users = await db.users.find().toArray();
  return users;
}

const getUser = async address => {
  const user = await db.users.findOne({ address });
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
    const result = await db.users.updateOne({ address }, { $set: { email }});
  }
  if (telegram) {
    const result = await db.users.updateOne({ address }, { $set: { telegram }});
  }
  const user = await db.users.findOne({ address });
  return user;
}

const postUser = async req => {
  const params = Object.keys(req.body);
  if (
    !params.includes('name')
      || !params.includes('address')
      || !params.includes('signature')
  ) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
  const { name, address, signature } = req.body;
  if (
    name === ''
      || !web3.utils.isAddress(address)
      || signature === ''
  ) {
    throw new HttpError(400, errors.WRONG_PARAM_VALUES);
  }
  const payload = JSON.stringify({address, name});
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
  } catch (err) {
    throw new HttpError(401, errors.MALFORMED_SIGNATURE);
  }
  if (signer !== address) {
    throw new HttpError(403, errors.UNAUTHORIZED);
  }
  const nameCount = await db.users.countDocuments({name});
  if (nameCount > 0) {
    throw new HttpError(400, errors.USER_EXISTS);
  }
  const addressCount = await db.users.countDocuments({address});
  if (addressCount > 0) {
    throw new HttpError(400, errors.USER_EXISTS);
  }
  const date = new Date();
  const effect = await db.users.insertOne({name, address, date, signature});
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
    console.error(effect);
  }
}

module.exports = { getUsers, getUser, putUser, postUser };
