const { HttpError, errors } = require('./control.js');
const db = require('./db.js');

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

}

module.exports = { getAssessments, getAssessment, postAssessment };
