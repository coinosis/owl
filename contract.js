const fetch = require('node-fetch');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx').Transaction;
const contractJson = require('./contracts/Event.json');
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

const register = async (contractAddress, feeWei, gasPrice) => {

  const nonce = await web3.eth.getTransactionCount(account);
  const contract = new web3.eth.Contract(contractJson.abi, contractAddress);
  const data = contract.methods.register().encodeABI();

  const txParams = {
    nonce: web3.utils.toHex(nonce),
    gasPrice: web3.utils.toHex(gasPrice),
    gasLimit: web3.utils.toHex(110000),
    to: contractAddress,
    value: web3.utils.toHex(feeWei),
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

  fetch(provider, options).then(response => {
    response.json().then(data => {
      console.log(data);
    });
  });
}

const contractAddress = '0x405C659F05074cb9b87C98031e18e9Ac5F676d65';
const feeWei = '800000000000000000';
const gasPrice = '50000000000';
register(contractAddress, feeWei, gasPrice);

// module.exports = { register };
