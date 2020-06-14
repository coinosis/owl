const Web3 = require('web3');
const { web3Provider } = require('./settings.js');

const web3 = new Web3(web3Provider);

module.exports = web3;
