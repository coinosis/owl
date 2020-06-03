db.users.updateMany({}, {$unset: { ip: 1 }})
db.events.updateMany({}, {$unset: { ip: 1 }})
db.assessments.updateMany({}, {$unset: { ip: 1 }})
