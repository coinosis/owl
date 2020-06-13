const Web3 = require('web3');
const fetch = require('node-fetch');
const settings = require('./settings.js');
const { HttpError, errors } = require('./control.js');

const { etherscanKey, web3Provider } = settings;
const web3 = new Web3(web3Provider);
const etherscanAPI = 'https://api.etherscan.io/api';
const ETHPrice = `${etherscanAPI}?module=stats&action=ethprice`
      + `&apiKey=${etherscanKey}`;
const gasTracker = `${etherscanAPI}?module=gastracker&action=gasoracle`
      + `&apiKey=${etherscanKey}`;

const getETHPrice = async () => {
  const response = await fetch(ETHPrice);
  if (!response.ok) {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const data = await response.json();
  if (data.status !== '1') {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const price = data.result.ethusd;
  return price;
}

const getGasPrice = async () => {
  const response = await fetch(gasTracker);
  if (!response.ok) {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const data = await response.json();
  if (data.status !== '1') {
    throw new HttpError(500, errors.SERVICE_UNAVAILABLE);
  }
  const { SafeGasPrice, ProposeGasPrice } = data.result;
  return {safe: SafeGasPrice, propose: ProposeGasPrice};
}

module.exports = { web3, getETHPrice, getGasPrice }
