db.users.createIndex({ address: 1 }, { unique: true });
db.events.createIndex({ url: 1 }, { unique: true });
db.events.createIndex({ address: 1 }, { unique: true });
db.transactions.createIndex({ event: 1, user: 1 }, { unique: true });
db.distributions.createIndex({ event: 1 }, { unique: true });
db.claps.createIndex({ event: 1, clapee: 1 }, { unique: true });
