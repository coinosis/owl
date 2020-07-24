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
const db = require('./db.js');
const { clapFor } = require('./eth.js');

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

module.exports = { getAssessments, getAssessment, postAssessment };
