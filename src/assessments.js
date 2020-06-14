const { HttpError, errors } = require('./control.js');
const db = require('./db.js');
const web3 = require('./web3.js');

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
  const params = Object.keys(req.body);
  if (
    !params.includes('event')
      || !params.includes('sender')
      || !params.includes('assessment')
      || !params.includes('signature')
  ) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
  const { event, sender, assessment, signature } = req.body;
  if (
    !/^[a-z0-9-]{1,60}$/.test(event)
      || !web3.utils.isAddress(sender)
      || typeof assessment !== 'object'
      || !/^0x[0-9a-f]+$/.test(signature)
  ) {
    throw new HttpError(400, errors.WRONG_PARAM_VALUES);
  }
  const payload = JSON.stringify({event, sender, assessment});
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
  } catch (err) {
    throw new HttpError(401, errors.MALFORMED_SIGNATURE);
  }
  if (signer !== sender) {
    throw new HttpError(403, errors.UNAUTHORIZED);
  }
  const assessmentCount = await db.assessments.countDocuments({sender, event});
  if (assessmentCount > 0) {
    throw new HttpError(400, 'assessment exists');
  }
  const eventFilter = await db.events.find({url: event}).toArray();
  if (eventFilter.length === 0) {
    throw new HttpError(400, errors.EVENT_NONEXISTENT);
  }
  const eventObject = eventFilter[0];
  const addresses = Object.keys(assessment);
  for (const i in addresses) {
    if (!web3.utils.isAddress(addresses[i])) {
      throw new HttpError(400, 'this is no address');
    }
    if (addresses[i] === sender) {
      throw new HttpError(400, 'sender can\'t assess themselves');
    }
  }
  const claps = Object.values(assessment);
  let totalClaps = 0;
  for (const i in claps) {
    if (
      isNaN(claps[i])
        || claps[i] < 0
        || Number(claps[i]) !== Math.round(claps[i])
    ) {
      throw new HttpError(400, errors.USER_NONEXISTENT);
    }
    totalClaps += claps[i];
  }
  const now = new Date();
  if (now < eventObject.beforeStart) {
    throw new HttpError(400, 'the event hasn\'t started');
  }
  const object = req.body;
  object.date = now;
  const effect = await db.assessments.insertOne(object);
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
}

module.exports = { getAssessments, getAssessment, postAssessment };
