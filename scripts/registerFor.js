const eth = require('../src/eth.js');
const dbModule = require('../src/db.js');

let db;
const initialize = async () => {
  await dbModule.connect();
  db = dbModule.getCollections();
  eth.initializeNonce();
}

const findEvent = async eventURL => {
  const event = await db.events.findOne({ url: eventURL });
  return event;
}

const registerFor = async (eventURL, userAddress) => {
  const { address, feeWei } = await findEvent(eventURL);
  const result = await eth.registerFor(address, userAddress, feeWei);
  console.log(result);
}

const main = async () => {
  await initialize();
  const eventURL = process.argv[2];
  const userAddress = process.argv[3];
  await registerFor(eventURL, userAddress);
  dbModule.disconnect();
}

main();
