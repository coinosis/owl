const { HttpError, errors, } = require('./control.js');
const dbModule = require('./db.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

// for pre-3box accounts only
const getUsers = async () => {
  const users = await db.users.find().toArray();
  return users;
}

// for pre-3box accounts only
const getUser = async address => {
  const user = await db.users.findOne({ address });
  if (!user) {
    throw new HttpError(404, errors.USER_NONEXISTENT);
  }
  return user;
}

module.exports = { initialize, getUsers, getUser, };
