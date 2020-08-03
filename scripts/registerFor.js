const eth = require('../src/eth.js');
const db = require('../src/db.js');

eth.initializeNonce();

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
  const eventURL = process.argv[2];
  const userAddress = process.argv[3];
  await registerFor(eventURL, userAddress);
  db.disconnect();
}

main();
