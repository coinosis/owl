const {
  HttpError,
  errors,
  checkParams,
  checkSignature,
  isString,
  isAddress,
  isAddressArray,
  isNumberArray,
} = require('./control.js');
const dbModule = require('./db.js');
const { clapFor } = require('./eth.js');
const web3 = require('./web3.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

// only for pre-v2 events
const getAssessments = async event => {
  const eventCount = await db.events.countDocuments({ url: event });
  if (eventCount === 0) {
    throw new HttpError(404, errors.EVENT_NONEXISTENT);
  }
  const assessments = await db.assessments.find({ event }).toArray();
  return assessments;
}

// only for pre-v2 events
const getAssessment = async (event, sender) => {
  const eventCount = await db.events.countDocuments({ url: event });
  if (eventCount === 0) {
    throw new HttpError(404, errors.EVENT_NONEXISTENT);
  }
  const assessment = await db.assessments.findOne({ event, sender });
  if (!assessment) {
    throw new HttpError(404, errors.ASSESSMENT_NONEXISTENT);
  }
  return assessment;
}

const clap = body => {
  const { event, clapper, clapee, delta, signature } = body;
  const payload = JSON.stringify({ event, user: clapper, });
  const hex = web3.utils.utf8ToHex(payload);
  const signer = web3.eth.accounts.recover(hex, signature);
  if (signer === clapper) {
    db.claps.updateOne(
      { event, clapee, },
      { $inc: { claps: delta, }, },
      { upsert: true, },
    );
  }
}

const getClaps = async (event, clapee) => {
  const result = await db.claps.findOne(
    { event, clapee },
    { projection: { _id: 0, claps: 1 } },
  );
  if (result === null) return 0;
  const { claps } = result;
  return claps;
}

const postAssessment = async req => {
  const params = {
    event: isString,
    sender: isAddress,
    addresses: isAddressArray,
    claps: isNumberArray,
  };
  await checkParams(params, req.body);
  const { event: eventURL, sender: senderAddress, addresses, claps } = req.body;
  await checkSignature(senderAddress, req);

  const event = await db.events.findOne({ url: eventURL });
  if (!event) {
    throw new HttpError(400, errors.EVENT_NONEXISTENT);
  }
  const sender = await db.users.findOne({ address: senderAddress });
  if (!sender) {
    throw new HttpError(400, errors.USER_NONEXISTENT);
  }
  if (addresses.length !== claps.length) {
    throw new HttpError(400, errors.LENGTH_MISMATCH);
  }
  const totalClaps = claps.reduce((a, b) => a + b);
  if (totalClaps > 100) {
    throw new HttpError(400, errors.TOO_MANY_CLAPS);
  }
  const result = await clapFor(event.address, senderAddress, addresses, claps);
  return result;
}

module.exports = {
  initialize,
  getAssessments,
  getAssessment,
  clap,
  getClaps,
  postAssessment,
};
