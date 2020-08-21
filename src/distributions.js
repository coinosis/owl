const { HttpError, errors } = require('./control.js');
const dbModule = require('./db.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

const getDistribution = async event => {
  const distribution = await db.distributions.findOne({ event });
  if (!distribution)
    throw new HttpError(404, errors.DISTRIBUTION_NONEXISTENT);
  return distribution;
}

const putDistribution = async event => {
  const eventCount = await db.events.countDocuments({ url: event });
  if (eventCount == 0) throw new HttpError(404, errors.EVENT_NONEXISTENT);
  const distributionCount = await db.distributions.countDocuments({ event });
  if (distributionCount != 0)
    throw new HttpError(400, errors.DISTRIBUTION_EXISTS);
  const ethPrice = '1';
  db.distributions.insertOne({ event, ethPrice });
}

module.exports = { initialize, getDistribution, putDistribution }
