const dbModule = require('./db.js');
const web3 = require('./web3.js');
const {
  HttpError,
  errors,
  checkParams,
  checkSignature,
  isAddress,
  isString,
  isURLArray,
  sameAddress,
} = require('./control.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const getSeries = async () => {
  const seriesList = await db.series.find().toArray();
  return seriesList;
}

const getASeries = async url => {
  const series = await db.series.findOne({ url });
  if (!series) {
    throw new HttpError(404, errors.SERIES_NONEXISTENT);
  }
  return series;
}

const postSeries = async req => {
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
  const seriesNameCount = await db.series.countDocuments({ name });
  if (seriesNameCount !== 0) {
    throw new HttpError(400, errors.SERIES_EXISTS, { name });
  }
  const seriesURLCount = await db.series.countDocuments({ url });
  if (seriesURLCount !== 0) {
    throw new HttpError(400, errors.SERIES_EXISTS, { url });
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
    const event = await db.events.findOne({ url });
    if (!event) {
      throw new HttpError(400, errors.EVENT_NONEXISTENT, { url });
    }
    if (!sameAddress(event.organizer, organizer)) {
      throw new HttpError(403, errors.UNAUTHORIZED, {
        eventOrganizer: event.organizer,
        seriesOrganizer: organizer,
      });
    }
  }
  const series = {
    name,
    url,
    description,
    events,
    organizer: web3.utils.toChecksumAddress(organizer),
  };
  const effect = await db.series.insertOne(series);
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    console.error(effect);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
}

module.exports = { initialize, getSeries, getASeries, postSeries, };
