const MongoClient = require('mongodb').MongoClient;
const dbURL = process.env.MONGODB_URI || 'mongodb://localhost:27017/coinosis';

const dbClient = new MongoClient(dbURL, { useUnifiedTopology: true });
dbClient.connect();
const db = dbClient.db();
const users = db.collection('users');
const events = db.collection('events');
const assessments = db.collection('assessments');
const payments = db.collection('payments');
const distributions = db.collection('distributions');

module.exports = { users, events, assessments, payments, distributions };
