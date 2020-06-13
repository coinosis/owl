const db = require('./db.js');

const getUsers = async () => {
  const users = await db.users.find().toArray();
  return users;
}

module.exports = { getUsers };
