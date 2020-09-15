const { HttpError, errors, checkSignature, } = require('./control.js');
const dbModule = require('./db.js');
const web3 = require('./web3.js');
const { addLiveStream } = require('./youtube.js');

let db;
const initialize = () => {
  db = dbModule.getCollections();
}

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

const attend = async req => {
  const { event: url, user: attendee, signature } = req.body;
  // await checkSignature(attendee,
  //                      { body: { event: url, user: attendee, signature, }}
  //                     );
  const lowercaseAttendee = attendee.toLowerCase();
  const event = await getEvent(url);
  if (event.feeWei > 0) {
    return;
  }
  if (event.attendees && event.attendees.includes(lowercaseAttendee)) {
    return;
  }
  db.events.updateOne(
    { url, },
    { $push: { attendees: lowercaseAttendee, } },
    { upsert: true, }
  );
}

// only for non-deposit events
const getAttendees = async url => {
  const event = await db.events.findOne({ url });
  if (!event) {
    throw new HttpError(404, errors.EVENT_NONEXISTENT);
  }
  const { attendees } = event;
  return attendees;
}

const postEvent = async req => {
  const params = Object.keys(req.body);
  const expectedParams = [
    'address',
    'name',
    'url',
    'description',
    'feeWei',
    'currency',
    'start',
    'end',
    'beforeStart',
    'afterEnd',
    'organizer',
    'signature',
  ];
  if(!expectedParams.every(param => params.includes(param))) {
    throw new HttpError(400, errors.INSUFFICIENT_PARAMS);
  }
  const {
    address,
    name,
    url,
    description,
    feeWei,
    currency,
    start,
    end,
    beforeStart,
    afterEnd,
    organizer,
    signature,
  } = req.body;
  if (
    !/^$|^0x[0-9a-fA-F]{40}$/.test(address)
      || name === ''
      || !/^[a-z1-9-]{1}[a-z0-9-]{0,59}$/.test(url)
      || description === ''
      || isNaN(Number(feeWei))
      || currency === ''
      || isNaN(new Date(start).getTime())
      || isNaN(new Date(end).getTime())
      || isNaN(new Date(beforeStart).getTime())
      || isNaN(new Date(afterEnd).getTime())
      || !web3.utils.isAddress(organizer)
      || !/^0x[0-9a-f]+$/.test(signature)
  ) {
    throw new HttpError(400, errors.WRONG_PARAM_VALUES);
  }
  const object = {
    address,
    name,
    url,
    description,
    feeWei,
    currency,
    start,
    end,
    beforeStart,
    afterEnd,
    organizer,
  };
  const payload = JSON.stringify(object);
  const hex = web3.utils.utf8ToHex(payload);
  let signer;
  try {
    signer = web3.eth.accounts.recover(hex, signature);
  } catch (err) {
    throw new HttpError(401, errors.MALFORMED_SIGNATURE);
  }
  if (signer.toLowerCase() !== organizer.toLowerCase()) {
    throw new HttpError(403, errors.UNAUTHORIZED, { signer, organizer });
  }
  const addressCount = await db.events.countDocuments({ address });
  if (addressCount !== 0 && address !== '') {
    throw new HttpError(400, errors.ADDRESS_EXISTS);
  }
  const nameCount = await db.events.countDocuments({name});
  if (nameCount !== 0) {
    throw new HttpError(400, errors.EVENT_EXISTS);
  }
  const urlCount = await db.events.countDocuments({url});
  if (urlCount !== 0) {
    throw new HttpError(400, errors.EVENT_EXISTS);
  }
  const feeAmount = Number(feeWei);
  if (feeAmount < 0 || feeAmount === Infinity) {
    throw new HttpError(400, errors.INVALID_FEE);
  }
  if (currency !== 'xDAI') throw new HttpError(400, errors.INVALID_CURRENCY);
  const creationDate = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const beforeStartDate = new Date(beforeStart);
  const afterEndDate = new Date(afterEnd);
  if (
    creationDate > startDate
      || beforeStartDate > startDate
      || startDate >= endDate
      || endDate > afterEndDate
  ) {
    throw new HttpError(400, errors.INVALID_DATE, {
      creationDate,
      beforeStartDate,
      startDate,
      endDate,
      afterEndDate,
    });
  }
  const version = 2;
  const shortDescription = description.substring(0, 5000);
  const {
    broadcastID,
    streamName,
  } = await addLiveStream(name, shortDescription, start, end, 'public');
  const event = {
    address,
    name,
    url,
    description: shortDescription,
    feeWei,
    currency,
    start: startDate,
    end: endDate,
    beforeStart: beforeStartDate,
    afterEnd: afterEndDate,
    organizer,
    signature,
    creation: creationDate,
    version,
    broadcastID,
    streamName,
  }
  const effect = await db.events.insertOne(event);
  if (effect.result.ok && effect.ops.length) {
    return effect.ops[0];
  } else {
    console.error(effect);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
}

module.exports = { initialize, getEvents, getEvent, attend, getAttendees, postEvent };
