const { HttpError, errors } = require('./control.js');
const db = require('./db.js');

const getEvents = async () => {
  const events = await db.events.find().toArray();
  return events;
}

const getEvent = async url => {
  const event = await db.events.findOne({ url });
  if (!event) {
    throw new HttpError(404, errors.EVENT_NONEXISTENT);
  }
  return event;
}

module.exports = { getEvents, getEvent };
