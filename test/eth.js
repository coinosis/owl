const eth = require('../src/eth.js');
const util = require('ethereumjs-util');
const express = require('express');
const chai = require('chai');
const { account } = require('../src/settings.js');

describe('sendRawTx', () => {
  it('succeeds', () => {

    const app = express();
    app.use(express.json());

    const tx = {
      to: '0x35ef9857E5e0E8B9Ac3f559CE6319C2DBe49dB29',
      value: '12341',
      data: '0x1234abcd',
      gasPrice: '50000000000',
    };

    app.post('/', (req, res) => {
      const id = req.body.id;
      const body = {
        jsonrpc: "2.0",
        id,
        result: "0x00"
      };
      res.json(body);
      if (req.body.method === 'eth_sendRawTransaction') {
        const payload = req.body.params[0];
        chai.assert.ok(verifySignature(payload, account));
        const fields = getFields(payload);
        for (const key in tx) {
          if (key === 'to') {
            chai.assert.equal(tx[key].toLowerCase(), fields[key].toLowerCase());
          } else {
            chai.assert.equal(tx[key], fields[key]);
          }
        }
      }
    });

    const server = app.listen(8555);
    setTimeout(() => server.close(), 1000);

    eth.sendRawTx(tx);

  });

});

const verifySignature = (payload, signer) => {
  const rawTx = util.rlp.decode(payload);
  const v = util.bufferToInt(rawTx[6]);
  const r = rawTx[7];
  const s = rawTx[8];
  const chainId = Math.floor((v - 35) / 2);
  if (chainId < 0) chainId = 0;
  const items = [
    ...rawTx.splice(0, 6),
    util.toBuffer(chainId),
    util.unpadBuffer(util.toBuffer(0)),
    util.unpadBuffer(util.toBuffer(0)),
  ];
  const hash = util.rlphash(items);
  const pubKey = util.ecrecover(hash, v, r, s, chainId);
  const address = util.publicToAddress(pubKey);
  const addressHex = util.bufferToHex(address);
  return addressHex.toLowerCase() === signer.toLowerCase();
}

const getFields = payload => {
  const rawTx = util.rlp.decode(payload);
  return {
    nonce: util.bufferToInt(rawTx[0]),
    gasPrice: util.bufferToInt(rawTx[1]),
    gasLimit: util.bufferToInt(rawTx[2]),
    to: util.bufferToHex(rawTx[3]),
    value: util.bufferToInt(rawTx[4]),
    data: util.bufferToHex(rawTx[5]),
  };
}
