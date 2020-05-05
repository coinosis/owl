db.users.createIndex({address: 1}, {unique: true});
db.events.createIndex({url: 1}, {unique: true});
