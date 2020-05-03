const address = '0xe1fF19182deb2058016Ae0627c1E4660A895196a';
const users = db.getCollection('users');
users.deleteOne({ address });
const assessments = db.getCollection('assessments');
assessments.deleteOne({sender: address});
