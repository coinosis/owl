const eth = require('../src/eth.js');
const web3 = require('../src/web3.js');
const util = require('ethereumjs-util');
const express = require('express');
const chai = require('chai');
const { account } = require('../src/settings.js');

describe('eth.js', () => {

  it('usdToWei', async () => {
    console.log(await eth.usdToWei(250));
  });

  describe('sendRawTx', () => {

    it('success', async () => {

      const tx = {
        to: '0x35ef9857E5e0E8B9Ac3f559CE6319C2DBe49dB29',
        value: '2',
        data: '0x1234abcd',
        gasPrice: '50000000000',
      };

      const handler = payload => {
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

      const server = listen(handler);
      await eth.sendRawTx(tx);
      server.close();

    });

  });

  it('registerFor', async () => {

    const contractAddress = '0xFd4F6865A2C5a7a80436991c033dCa5697a808d7';
    const attendee = '0x8f4ed0E2c5714CC0A30336d67CF572A69c261b83';
    const feeWei = '12341234';
    const signature = util.keccakFromString('registerFor(address)')
          .subarray(0, 4);
    const argument = pad(attendee);
    const expectedData = util.bufferToHex(Buffer.concat([signature, argument]))

    const handler = payload => {
      const fields = getFields(payload);
      chai.assert.equal(fields.data, expectedData);
    }

    const server = listen(handler);
    await eth.registerFor(contractAddress, attendee, feeWei);
    server.close();

  });

  it('clapFor', async () => {

    const contractAddress = '0x9E98360Daa9bbD8811D020Fd2DC6Ad38A659445E';
    const clapper = '0x7FAb8De7BA54e7E70D359201a7b0fe307Acc0Ec6';
    const attendees = [
      '0xDD148eFA3c1d21202580D10E586d0d122D3e0B56',
      '0xDEAaE56AC1c3873291C392571e7829b4DFD61426',
      '0x65309eAbBE44E2f20252f9AA5FcB5cCCf838953a',
    ];
    const claps = [ 2, 4, 8 ];
    const signature = 'clapFor(address,address[],uint256[])';
    const dataObject = {
      signatureChunk: util.keccakFromString(signature).subarray(0, 4),
      clapperChunk: pad(clapper),
      attendeesLocation: pad(web3.utils.toHex(32 * 3)),
      clapsLocation: pad(web3.utils.toHex(32 * 7)),
      attendeesLength: pad('0x03'),
      attendeesChunk: Buffer.concat(attendees.map(attendee => pad(attendee))),
      clapsLength: pad('0x03'),
      clapsChunk: Buffer.concat(claps.map(clap => pad(clap))),
    };
    const expectedDataBuffer = Buffer.concat(Object.values(dataObject));
    const expectedData = util.bufferToHex(expectedDataBuffer);

    const handler = payload => {
      const fields = getFields(payload);
      chai.assert.equal(fields.data, expectedData);
    }

    const server = listen(handler);
    await eth.clapFor(contractAddress, clapper, attendees, claps);
    server.close();

  });

});

const pad = value => util.setLengthLeft(util.toBuffer(value), 32);

const listen = handler => {
  const app = express();
  app.use(express.json());
  const server = app.listen(8555);
  app.post('/', (req, res) => {
    const { method, id, params: [ payload ] } = req.body;
    const result =
          method === 'eth_getTransactionCount'
          ? "0x02"
          : method === 'eth_call'
          ? ""
          : ""
    const body = {
      jsonrpc: "2.0",
      id,
      result,
    };
    res.json(body);
    if (method === 'eth_sendRawTransaction') {
      handler(payload);
    }
  });
  return server;
}

const verifySignature = (payload, signer) => {
  const rawTx = util.rlp.decode(payload);
  const v = util.bufferToInt(rawTx[6]);
  const r = rawTx[7];
  const s = rawTx[8];
  const chainId = Math.max(Math.floor((v - 35) / 2), 0);
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
