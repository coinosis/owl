const { HttpError, errors } = require('./control.js');
const db = require('./db.js');
const { getETHPrice } = require('./web3.js');

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
  const ethPrice = await getETHPrice();
  db.distributions.insertOne({ event, ethPrice });
}

module.exports = { getDistribution, putDistribution }
