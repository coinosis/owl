db.events.updateMany({currency: {$exists: false}}, {$set: {currency: 'ETH'}});
