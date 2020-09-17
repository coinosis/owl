const MongoClient = require('mongodb').MongoClient;
const uri = process.env.DB || 'mongodb://localhost:27017/coinosis';

const Client = new MongoClient(uri , {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let db, client;
const connect = async () => {
  client = await Client.connect();
  db = client.db();
}

const getCollections = () => {
  return {
    users: db.collection('users'),
    events: db.collection('events'),
    courses: db.collection('courses'),
    claps: db.collection('claps'),
    assessments: db.collection('assessments'),
    payments: db.collection('payments'),
    transactions: db.collection('transactions'),
    closable: db.collection('closable'),
    distributions: db.collection('distributions'),
  }
}

const disconnect = () => {
  client.close();
}

module.exports = { connect, getCollections, disconnect };
