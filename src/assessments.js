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

}

const postAssessment = async req => {

}

module.exports = { getAssessments, getAssessment, postAssessment };
