const dbModule = require('./db.js');
const {
  HttpError,
  errors,
  checkParams,
  checkSignature,
  isAddress,
  isString,
  isURLArray,
} = require('./control.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const postCourse = async req => {
  const expectedParams = {
    name: isString,
    url: isString,
    description: isString,
    events: isURLArray,
    organizer: isAddress,
  };
  await checkParams(expectedParams, req.body);
  const { name, url, description, events, organizer, } = req.body;
  await checkSignature(organizer, req);
  const courseNameCount = await db.courses.countDocuments({ name });
  if (courseNameCount !== 0) {
    throw new HttpError(400, errors.COURSE_EXISTS, { name });
  }
  const courseURLCount = await db.courses.countDocuments({ url });
  if (courseURLCount !== 0) {
    throw new HttpError(400, errors.COURSE_EXISTS, { url });
  }
  const nameCount = await db.events.countDocuments({ name });
  if (nameCount !== 0) {
    throw new HttpError(400, errors.EVENT_EXISTS, { name });
  }
  const urlCount = await db.events.countDocuments({ url });
  if (urlCount !== 0) {
    throw new HttpError(400, errors.EVENT_EXISTS, { url });
  }
  for (let i = 0; i < events.length; i++) {
    const url = events[i];
    const urlCount = await db.events.countDocuments({ url });
    if (urlCount !== 1) {
      throw new HttpError(400, errors.EVENT_NONEXISTENT, { url });
    }
  }
  const course = { name, url, description, events, organizer, };
  const effect = await db.courses.insertOne(course);
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    console.error(effect);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
}

module.exports = { initialize, postCourse, };
