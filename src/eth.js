const web3 = require('./web3.js');
const fetch = require('node-fetch');
const EthereumTx = require('ethereumjs-tx').Transaction;
const { bufferToHex } = require('ethereumjs-util');
const abi = require('../contracts/ProxyEvent.abi.json');
const { etherscanKey, web3Provider, chain, account } = require('./settings.js');
const { HttpError, errors, statuses } = require('./control.js');

const privateKeyString = process.env.PRIVATE_KEY;
if (privateKeyString === undefined) throw new Error('Private key not set');
const privateKey = Buffer.from(privateKeyString.substring(2), 'hex');
const etherscanAPI = 'https://api.etherscan.io/api';
const ETHPrice = `${etherscanAPI}?module=stats&action=ethprice`
      + `&apiKey=${etherscanKey}`;
const gasTracker = `${etherscanAPI}?module=gastracker&action=gasoracle`
      + `&apiKey=${etherscanKey}`;

const getETHPrice = async () => {
  const response = await fetch(ETHPrice);
  if (!response.ok) {
    console.error(response);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const data = await response.json();
  if (data.status !== '1') {
    console.error(data);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const price = data.result.ethusd;
  return price;
}

const getGasPrice = async () => {
  const response = await fetch(gasTracker);
  if (!response.ok) {
    console.error(response);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const data = await response.json();
  if (data.status !== '1') {
    console.error(data);
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const { SafeGasPrice, ProposeGasPrice } = data.result;
  const safe = web3.utils.toWei(SafeGasPrice, 'gwei');
  const propose = web3.utils.toWei(ProposeGasPrice, 'gwei');
  return { safe, propose };
}

const registerFor = async (contractAddress, attendee, feeWei) => {

  const contract = new web3.eth.Contract(abi, contractAddress);
  const attendees = await contract.methods.getAttendees().call();
  if (attendees.includes(attendee)) {
    return { address: attendee, status: statuses.ALREADY_REGISTERED };
  }
  const gasPrice = await getGasPrice();
  const tx = {
    to: contractAddress,
    value: feeWei,
    data: contract.methods.registerFor(attendee).encodeABI(),
    gasPrice: gasPrice.propose,
  };
  const response = await sendRawTx(tx);
  return {
    address: attendee,
    status: statuses.SENT,
    tx: response.result,
  };

}

const clapFor = async (contractAddress, clapper, attendees, claps) => {

  const contract = new web3.eth.Contract(abi, contractAddress);
  const gasPrice = await getGasPrice();
  const tx = {
    to: contractAddress,
    value: 0,
    data: contract.methods.clapFor(clapper, attendees, claps).encodeABI(),
    gasPrice: gasPrice.propose,
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
    { chain, hardfork: 'istanbul' }
  );

  tx.sign(privateKey);
  const serializedTx = tx.serialize();
  const hexTx = bufferToHex(serializedTx);
  const object = {
    jsonrpc: '2.0',
    method: 'eth_sendRawTransaction',
    params: [ hexTx ],
    id: 123,
  };
  const body = JSON.stringify(object);
  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  };

  const response = await fetch(web3Provider, options);
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

module.exports = { getETHPrice, getGasPrice, registerFor, clapFor, sendRawTx };
