const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinosis';

const client = new MongoClient(url, { useUnifiedTopology: true });
client.connect();
const db = client.db();
const users = db.collection('users');
const events = db.collection('events');
const assessments = db.collection('assessments');
const payments = db.collection('payments');
const transactions = db.collection('transactions');
const distributions = db.collection('distributions');

const disconnect = () => {
  client.close();
}

module.exports = {
  users,
  events,
  assessments,
  payments,
  transactions,
  distributions,
  disconnect,
};
