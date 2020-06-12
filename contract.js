const fetch = require('node-fetch');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;
const contractJson = require('./contracts/ProxyEvent.json');
const settings = require('./settings.json');

const privateKeyString = process.env.PRIVATE_KEY;
if (privateKeyString === undefined) throw new Error('Private key not set');
const environment = process.env.ENVIRONMENT || 'development';

const privateKey = Buffer.from(privateKeyString.substring(2), 'hex');
const account = '0xe1fF19182deb2058016Ae0627c1E4660A895196a';
const provider = settings[environment].web3Provider;
const web3 = new Web3(provider);

const chains = {
  development: {
    name: 'ropsten', // keep ethereumjs-tx happy, ganache-cli won't mind
    id: 3,
  },
  testing: {
    name: 'ropsten',
    id: 3,
  },
  production: {
    name: 'mainnet',
    id: 1,
  },
};

const registerFor = async (contractAddress, attendee, feeWei, gasPrice) => {

  const contract = new web3.eth.Contract(contractJson.abi, contractAddress);
  const attendees = await contract.methods.getAttendees().call();
  if (attendees.includes(attendee)) return true;
  const tx = {
    to: contractAddress,
    value: feeWei,
    data: contract.methods.registerFor(attendee).encodeABI(),
    gasPrice,
  };
  const result = await sendRawTx(tx);
  return result;

}

const clapFor = async (
  contractAddress,
  clapper,
  attendees,
  claps,
  gasPrice
) => {

  const contract = new web3.eth.Contract(contractJson.abi, contractAddress);
  const tx = {
    to: contractAddress,
    value: 0,
    data: contract.methods.clapFor(clapper, attendees, claps).encodeABI(),
    gasPrice,
  };
  const result = await sendRawTx(tx);
  return result;

}

const sendRawTx = async ({ to, value, data, gasPrice }) => {

  const nonce = await web3.eth.getTransactionCount(account);

  const txParams = {
    nonce: web3.utils.toHex(nonce),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(110000),
    to,
    value: web3.utils.toHex(value),
    data,
  };

  const tx = new EthereumTx(
    txParams,
    { chain: chains[environment].name, hardfork: 'istanbul' }
  );

  tx.sign(privateKey);
  const serializedTx = tx.serialize();
  const hexTx = '0x' + serializedTx.toString('hex');
  const object = {
    jsonrpc: '2.0',
    method: 'eth_sendRawTransaction',
    params: [ hexTx ],
    id: chains[environment].id,
  };
  const body = JSON.stringify(object);
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  };

  const response = await fetch(provider, options);
  const result = await response.json();
  return result;
}

const main = async () => {
  const contractAddress = '0x68aEF7a46577eaBba909aAc70E79BCBe1e186146';
  const attendees = [
    '0x44F14099B8b9C60515E83a0cB1a85E14982BB091',
    '0xbD0FdA31473461b21CB7d723e70B3b5C1C9cb251',
    '0x0f494B8cB38642C376E605D64A7227caC6431aFc',
  ];
  const feeWei = '3333';
  const gasPrice = '50000000000';
  console.log(await registerFor(contractAddress, attendees[0], feeWei, gasPrice));
  console.log(await registerFor(contractAddress, attendees[1], feeWei, gasPrice));
  console.log(await registerFor(contractAddress, attendees[2], feeWei, gasPrice));

  const clapper = attendees[0];
  const claps = [ 0, 6, 4 ];
  console.log(await clapFor(contractAddress, clapper, attendees, claps, gasPrice));

}

// main();

module.exports = { registerFor, clapFor };
