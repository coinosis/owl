const web3 = require('./web3.js');
const fetch = require('node-fetch');
const EthereumTx = require('ethereumjs-tx').Transaction;
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const abi = require('../contracts/ProxyEvent.abi.json');
const { etherscanKey, web3Provider, chain, account } = require('./settings.js');
const { HttpError, errors, statuses } = require('./control.js');

const privateKeyString = process.env.PRIVATE_KEY;
if (privateKeyString === undefined) throw new Error('Private key not set');
const privateKey = toBuffer(privateKeyString);
const etherscanAPI = 'https://api.etherscan.io/api';
const ETHPrice = `${etherscanAPI}?module=stats&action=ethprice`
      + `&apiKey=${etherscanKey}`;
const gasTracker = `${etherscanAPI}?module=gastracker&action=gasoracle`
      + `&apiKey=${etherscanKey}`;

let nonce;
const initializeNonce = async () => {
  nonce = Number(await web3.eth.getTransactionCount(account));
  console.log(`obtained nonce ${nonce}`);
}

const getNonce = () => {
  const oldNonce = nonce;
  nonce += 1;
  console.log(`using nonce ${oldNonce}`);
  return oldNonce;
}

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

const usdToWei = async usd => {
  const ethPrice = await getETHPrice();
  const eth = usd / ethPrice;
  const truncatedETH = eth.toFixed(18);
  const wei = web3.utils.toWei(truncatedETH);
  return wei;
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

  console.log(`registerFor({
    contract: '${contractAddress}',
    attendee: '${attendee}',
    feeWei: '${feeWei}'
  })`);
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
  let result = { address: attendee };
  if (response.error) {
    result = {
      ...result,
      error: response.error.message,
      status: statuses.NOT_SENT,
    };
    if (result.error.match('nonce')) {
      initializeNonce();
      console.log(response);
    }
  } else {
    result = {
      ...result,
      txHash: response.result,
      status: statuses.SENT,
    }
  }

  console.log(result);
  return result;

}

const clapFor = async (contractAddress, clapper, attendees, claps) => {

  console.log(`clapFor({
    contract: '${contractAddress}',
    clapper: '${clapper}',
    attendees: '[${attendees}],
    claps: [${claps}]
  })`);
  const contract = new web3.eth.Contract(abi, contractAddress);
  const gasPrice = await getGasPrice();
  const tx = {
    to: contractAddress,
    value: 0,
    data: contract.methods.clapFor(clapper, attendees, claps).encodeABI(),
    gasPrice: gasPrice.propose,
  };
  const result = await sendRawTx(tx);
  console.log(result);
  return result;

}

const sendRawTx = async ({ to, value, data, gasPrice }) => {

  const nonce = getNonce();

  const txParams = {
    nonce: web3.utils.toHex(nonce),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(1000000),
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
    id: nonce,
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

module.exports = {
  initializeNonce,
  getETHPrice,
  getGasPrice,
  registerFor,
  clapFor,
  sendRawTx,
  usdToWei,
};
