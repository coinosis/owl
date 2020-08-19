db.transactions.deleteMany({});
db.transactions.dropIndexes();
db.transactions.createIndex({ event: 1, user: 1 }, { unique: true });
